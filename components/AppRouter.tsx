import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";
import { hasAdminRole, checkAdminFallback } from "../utils/authRoles";
import { logger } from "../utils/logger";
import AdminLogin from "./AdminLogin.tsx";
import { TechnicianAuthProvider } from "./TechnicianAuthContext.tsx";

const App = lazy(() => import("../App.tsx"));
const TechnicianPortal = lazy(() => import("./technician-portal/TechnicianPortal.tsx"));
const EmergencyAdminRecovery = lazy(() => import("./EmergencyAdminRecovery.tsx"));
const InviteSignup = lazy(() => import("./InviteSignup.tsx"));
const ResetPassword = lazy(() => import("./ResetPassword.tsx"));

const LoadingFallback = () => (
  <div className="min-h-screen bg-paper  flex items-center justify-center p-4">
    <div className="text-center">
      <div className="mx-auto mb-4 h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-primary dark:text-cream font-medium">
        جاري التحميل...
      </p>
    </div>
  </div>
);

type AdminAccessState = "checking" | "allowed" | "login";

const isTechnicianPath = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.location.pathname.startsWith("/technician");
};

/**
 * Check if current path is the reset password route.
 */
const isResetPasswordPath = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.location.pathname === "/reset-password";
};

/**
 * Check if current path is a recovery route and extract the recovery key.
 * Pattern: /admin/recovery/<key>
 */
const getRecoveryRouteKey = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const path = window.location.pathname;
  const match = path.match(/^\/admin\/recovery\/([^/]+)$/);
  if (!match) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
};

const isRecoveryRouteWithoutKey = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.location.pathname === "/admin/recovery";
};

/**
 * Check if current path is an invite route and extract token
 * Returns null if not an invite route, otherwise returns role and token
 */
const getInviteRouteInfo = (): { role: "admin" | "technician"; token: string } | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  if (path === "/admin/invite" && token) {
    return { role: "admin", token };
  }

  if (path === "/technician/invite" && token) {
    return { role: "technician", token };
  }

  return null;
};

/**
 * Check if current path is an invite route without a token (invalid state)
 */
const isInviteRouteWithoutToken = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  return (path === "/admin/invite" || path === "/technician/invite") && !token;
};

const AppRouter: React.FC = () => {
  const [adminAccessState, setAdminAccessState] =
    useState<AdminAccessState>("checking");
  const [technicianRoute, setTechnicianRoute] = useState<boolean>(() =>
    isTechnicianPath(),
  );
  const [resetPasswordRoute, setResetPasswordRoute] = useState<boolean>(() =>
    isResetPasswordPath(),
  );
  const [recoveryRouteKey, setRecoveryRouteKey] = useState<string | null>(() =>
    getRecoveryRouteKey(),
  );
  const [inviteRouteInfo, setInviteRouteInfo] = useState<{
    role: "admin" | "technician";
    token: string;
  } | null>(() => getInviteRouteInfo());
  const redirectingRef = useRef(false);
  // Prevent re-evaluation once admin access is determined
  const adminAccessEvaluatedRef = useRef(false);

  const redirectToTechnician = useCallback(async (signOutFirst: boolean) => {
    if (typeof window === "undefined" || redirectingRef.current) {
      return;
    }

    redirectingRef.current = true;

    if (signOutFirst) {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        logger.error("Failed to sign out before redirect", error, "auth");
      }
    }

    window.location.replace("/technician");
  }, []);

  const evaluateRootAccess = useCallback(
    async (session: Session | null) => {
      logger.debug("evaluateRootAccess called", { sessionExists: !!session, userId: session?.user?.id }, 'auth');

      // Dev-only bypass: set localStorage 'dev-bypass-auth' to '1' to skip admin auth
      if (import.meta.env.DEV && window.localStorage.getItem("dev-bypass-auth") === "1") {
        setAdminAccessState("allowed");
        return;
      }
      
      if (adminAccessEvaluatedRef.current) {
        logger.debug("Admin access already evaluated, skipping re-check", undefined, 'auth');
        return;
      }
      
      if (isTechnicianPath()) {
        logger.debug("On technician path, skipping admin check", undefined, 'auth');
        setTechnicianRoute(true);
        return;
      }

      setTechnicianRoute(false);
      setAdminAccessState("checking");

      if (!session?.user) {
        logger.debug("No session user, setting state to 'login'", undefined, 'auth');
        adminAccessEvaluatedRef.current = true;
        setAdminAccessState("login");
        return;
      }

      logger.debug("Checking hasAdminRole for user", { userId: session.user.id }, 'auth');
      if (hasAdminRole(session.user)) {
        logger.debug("User has admin role, setting state to 'allowed'", undefined, 'auth');
        adminAccessEvaluatedRef.current = true;
        setAdminAccessState("allowed");
        return;
      }

      logger.debug("User does NOT have explicit admin role, checking technician profile", undefined, 'auth');
      const { data: technicianProfile, error: technicianError } = await supabase
        .from("technicians")
        .select("id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (technicianError) {
        logger.error("Failed checking technician profile", technicianError, 'auth');
        const fallbackResult = await checkAdminFallback(session.user, supabase);
        if (fallbackResult === true) {
          logger.debug("Fallback check passed, allowing admin access", undefined, 'auth');
          adminAccessEvaluatedRef.current = true;
          setAdminAccessState("allowed");
          return;
        }
        await redirectToTechnician(true);
        return;
      }

      if (technicianProfile?.id) {
        logger.debug("User is a technician, redirecting to /technician", undefined, 'auth');
        await redirectToTechnician(false);
        return;
      }

      logger.debug("User is not a technician, using fallback admin detection", undefined, 'auth');
      const fallbackResult = await checkAdminFallback(session.user, supabase);
      
      if (fallbackResult === true) {
        logger.debug("Fallback check passed - user is not a technician, granting admin access", undefined, 'auth');
        adminAccessEvaluatedRef.current = true;
        setAdminAccessState("allowed");
        return;
      }

      logger.debug("Fallback check failed, redirecting to /technician with signout", undefined, 'auth');
      await redirectToTechnician(true);
    },
    [redirectToTechnician],
  );

  useEffect(() => {
    let isActive = true;

    const checkCurrentRoute = () => {
      if (!isActive) {
        return;
      }

      setRecoveryRouteKey(getRecoveryRouteKey());

      // Update invite route info
      setInviteRouteInfo(getInviteRouteInfo());

      // Update reset password route
      setResetPasswordRoute(isResetPasswordPath());

      const onTechnicianRoute = isTechnicianPath();
      setTechnicianRoute(onTechnicianRoute);
    };

    const initialize = async () => {
      checkCurrentRoute();

      // Skip auth evaluation for public recovery, invite, and reset password routes.
      if (
        getRecoveryRouteKey() ||
        isRecoveryRouteWithoutKey() ||
        getInviteRouteInfo() ||
        isInviteRouteWithoutToken() ||
        isResetPasswordPath()
      ) {
        return;
      }

      if (isTechnicianPath()) {
        return;
      }

      // Dev-only bypass: set localStorage 'dev-bypass-auth' to '1' to skip admin auth
      if (import.meta.env.DEV && window.localStorage.getItem("dev-bypass-auth") === "1") {
        setAdminAccessState("allowed");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isActive) {
        return;
      }

      await evaluateRootAccess(session);
    };

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      checkCurrentRoute();

      // Skip auth evaluation for public recovery, invite, and reset password routes.
      if (
        !isActive ||
        getRecoveryRouteKey() ||
        isRecoveryRouteWithoutKey() ||
        getInviteRouteInfo() ||
        isInviteRouteWithoutToken() ||
        isResetPasswordPath()
      ) {
        return;
      }

      if (isTechnicianPath()) {
        return;
      }

      await evaluateRootAccess(session);
    });

    const handlePopState = () => {
      checkCurrentRoute();

      // Skip auth evaluation for public recovery, invite, and reset password routes.
      if (
        getRecoveryRouteKey() ||
        isRecoveryRouteWithoutKey() ||
        getInviteRouteInfo() ||
        isInviteRouteWithoutToken() ||
        isResetPasswordPath()
      ) {
        return;
      }

      if (isTechnicianPath()) {
        return;
      }

      void supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (!isActive) {
          return;
        }
        await evaluateRootAccess(session);
      });
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      isActive = false;
      window.removeEventListener("popstate", handlePopState);
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdminLogout = useCallback(async () => {
    await supabase.auth.signOut();
    adminAccessEvaluatedRef.current = false;
    setAdminAccessState("login");
  }, []);

  // ========================================
  // Route Evaluation (order matters!)
  // 1. Reset password route (public, no auth required)
  // 2. Recovery route (public, no auth required)
  // 3. Invite routes (public, no auth required)
  // 4. Technician routes (technician auth required)
  // 5. Root admin gating (admin auth required)
  // ========================================

  // Handle reset password route - render ResetPassword component
  if (resetPasswordRoute) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <ResetPassword />
      </Suspense>
    );
  }

  if (isRecoveryRouteWithoutKey()) {
    window.location.replace("/");
    return (
      <div className="min-h-screen bg-paper  flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-primary dark:text-cream font-medium">
            Redirecting...
          </p>
        </div>
      </div>
    );
  }

  if (recoveryRouteKey) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <EmergencyAdminRecovery
          recoveryKey={recoveryRouteKey}
          onBack={() => {
            window.location.href = "/";
          }}
        />
      </Suspense>
    );
  }

  // Handle invite route without token - redirect to appropriate login
  if (isInviteRouteWithoutToken()) {
    const path = window.location.pathname;
    window.location.replace(path.startsWith("/admin") ? "/" : "/technician");
    return (
      <div className="min-h-screen bg-paper  flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-primary dark:text-cream font-medium">
            Redirecting...
          </p>
        </div>
      </div>
    );
  }

  // Handle valid invite routes - render InviteSignup
  if (inviteRouteInfo) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <InviteSignup
          role={inviteRouteInfo.role}
          token={inviteRouteInfo.token}
          onSuccess={(user) => {
            if (user.role === "admin") {
              window.location.href = "/";
            } else {
              window.location.href = "/technician";
            }
          }}
          onBack={() => {
            if (inviteRouteInfo.role === "admin") {
              window.location.href = "/";
            } else {
              window.location.href = "/technician";
            }
          }}
        />
      </Suspense>
    );
  }

  if (technicianRoute) {
    return (
      <TechnicianAuthProvider>
        <Suspense fallback={<LoadingFallback />}>
          <TechnicianPortal />
        </Suspense>
      </TechnicianAuthProvider>
    );
  }

  if (adminAccessState === "checking") {
    return (
      <div className="min-h-screen bg-paper  flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-primary dark:text-cream font-medium">
            Checking access...
          </p>
        </div>
      </div>
    );
  }

  if (adminAccessState === "login") {
    return <AdminLogin />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <App onAdminLogout={handleAdminLogout} />
    </Suspense>
  );
};

export default AppRouter;
