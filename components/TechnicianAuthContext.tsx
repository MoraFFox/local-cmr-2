import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";
import { hasAdminRole } from "../utils/authRoles";
import type { LegacyAutoLinkResponse } from "../types";
import { useToast } from "./ToastContext";
import { logger } from "../utils/logger";

const AUTH_BOOTSTRAP_TIMEOUT_MS = 15000;
const AUTO_LINK_THROTTLE_MS = 24 * 60 * 60 * 1000;
const AUTO_LINK_LAST_RUN_KEY_PREFIX = "cmr_auto_link_last_run_";

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Operation timed out'));
    }, ms);
    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
};

const sanitizeError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An error occurred';
};

const ARABIC_DIGIT_MAP: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
};

const normalizeDigits = (value: string): string => {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => ARABIC_DIGIT_MAP[digit] ?? digit);
};

const normalizePhoneNumber = (phone: string): string => {
  let normalizedPhone = normalizeDigits(phone.trim()).replace(/[^\d+]/g, "");
  normalizedPhone = normalizedPhone.replace(/(?!^)\+/g, "");

  if (!normalizedPhone || normalizedPhone === "+") {
    return "";
  }

  if (normalizedPhone.startsWith("00")) {
    normalizedPhone = `+${normalizedPhone.substring(2)}`;
  }

  if (normalizedPhone.startsWith("01") && normalizedPhone.length === 11) {
    return `+20${normalizedPhone.substring(1)}`;
  }

  if (!normalizedPhone.startsWith("+")) {
    return `+20${normalizedPhone}`;
  }

  return normalizedPhone;
};

const getMetadataString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
};

export interface Technician {
  id: string;
  email?: string;
  name: string;
  phone?: string;
}

interface TechnicianAuthContextType {
  technician: Technician | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authBootstrapError: string | null;
  login: (
    emailOrPhone: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  retryAuthBootstrap: () => Promise<void>;
}

const TechnicianAuthContext = createContext<
  TechnicianAuthContextType | undefined
>(undefined);

export const TechnicianAuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [technician, setTechnician] = useState<Technician | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authBootstrapError, setAuthBootstrapError] = useState<string | null>(null);
  const { showToast } = useToast();

  const isMountedRef = useRef(true);
  const bootstrapRunIdRef = useRef(0);
  const technicianRef = useRef<Technician | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

const mapProfileToTechnician = (profile: any): Technician => ({
    id: profile.id,
    email: profile.email || undefined,
    name: profile.name,
    phone: profile.phone || undefined,
  });

  const createAdminTechnicianProfile = async (user: User): Promise<Technician | null> => {
    const metadataName = getMetadataString(user.user_metadata?.name);
    const metadataPhone = getMetadataString(user.user_metadata?.phone);
    const fallbackName = user.email?.split("@")[0] || "Admin";
    const normalizedPhone = normalizePhoneNumber(user.phone || metadataPhone || "");

    const { data, error } = await supabase
      .from("technicians")
      .upsert(
        [
          {
            id: user.id,
            name: metadataName || fallbackName,
            email: user.email || null,
            phone: normalizedPhone || null,
          },
        ],
        { onConflict: "id" },
      )
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data ? mapProfileToTechnician(data) : null;
  };

  const runAutoLinkInBackground = async (userId: string): Promise<void> => {
    try {
      const lastRunKey = `${AUTO_LINK_LAST_RUN_KEY_PREFIX}${userId}`;
      const lastRunStr = localStorage.getItem(lastRunKey);

      if (lastRunStr) {
        const lastRun = parseInt(lastRunStr, 10);
        if (!isNaN(lastRun) && Date.now() - lastRun < AUTO_LINK_THROTTLE_MS) {
          return;
        }
      }

      const { data, error } = await supabase.rpc(
        'auto_link_legacy_records_for_current_technician',
        {
          min_confidence: 0.70,
          min_margin: 0.10
        }
      ) as { data: LegacyAutoLinkResponse | null; error: unknown };

      if (error) {
        logger.error('Auto-link error', sanitizeError(error), 'auth');
        return;
      }

      localStorage.setItem(lastRunKey, Date.now().toString());

      if (data?.linked_count && data.linked_count > 0) {
        showToast(
          `تم ربط ${data.linked_count} سجل قديم بحسابك`,
          'success'
        );
      }
    } catch (err) {
      logger.error('Auto-link exception', sanitizeError(err), 'auth');
    }
  };

  const bootstrapFromSession = async (session: Session | null, _event?: string) => {
    const runId = ++bootstrapRunIdRef.current;

    if (!isMountedRef.current) return;
    setAuthBootstrapError(null);

      if (!session?.user) {
        if (isMountedRef.current) {
          technicianRef.current = null;
          setTechnician(null);
          setIsLoading(false);
        }
        return;
    }

    // Only show loading spinner if not already authenticated
    if (!technicianRef.current) {
      setIsLoading(true);
    }

    const user = session.user;

    try {
      const fetchProfile = async () => {
        return supabase
          .from("technicians")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
      };

      const { data, error } = await withTimeout(fetchProfile(), AUTH_BOOTSTRAP_TIMEOUT_MS);

      if (!isMountedRef.current || runId !== bootstrapRunIdRef.current) return;

      if (error) {
        throw error;
      }

      if (data) {
          const tech = mapProfileToTechnician(data);
          technicianRef.current = tech;
          setTechnician(tech);
          setIsLoading(false);
          void runAutoLinkInBackground(user.id);
          return;
        }

        if (hasAdminRole(user)) {
          const autoCreatedProfile = await createAdminTechnicianProfile(user);
          if (!isMountedRef.current || runId !== bootstrapRunIdRef.current) return;

          if (autoCreatedProfile) {
            technicianRef.current = autoCreatedProfile;
            setTechnician(autoCreatedProfile);
            setIsLoading(false);
            void runAutoLinkInBackground(user.id);
          } else {
            technicianRef.current = null;
            setTechnician(null);
            setIsLoading(false);
          }
          return;
        }

        await supabase.auth.signOut();
        if (isMountedRef.current && runId === bootstrapRunIdRef.current) {
          technicianRef.current = null;
          setTechnician(null);
          setIsLoading(false);
        setAuthBootstrapError("لم يتم العثور على ملف شخصي. يرجى الاتصال بالمسؤول.");
      }
    } catch (err) {
      if (!isMountedRef.current || runId !== bootstrapRunIdRef.current) return;

      logger.error("Bootstrap error", sanitizeError(err), 'auth');
      setAuthBootstrapError("فشل تحميل بيانات المستخدم. يرجى التحقق من الاتصال والمحاولة مرة أخرى.");
      setIsLoading(false);
    }
  };

  const retryAuthBootstrap = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setAuthBootstrapError(null);
      const { data: { session } } = await supabase.auth.getSession();
      await bootstrapFromSession(session, "retry");
    } catch (error) {
      logger.error("Retry bootstrap error", sanitizeError(error), 'auth');
      setAuthBootstrapError("فشل إعادة التحقق من الحساب. يرجى المحاولة مرة أخرى.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await bootstrapFromSession(session, 'INITIAL');
      } catch (error) {
        logger.error("Auth initialization error", sanitizeError(error), 'auth');
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Always skip token refresh events - the session is still valid
        if (event === 'TOKEN_REFRESHED') {
          return;
        }
        // Skip INITIAL_SESSION if bootstrap already started or completed
        if (event === 'INITIAL_SESSION') {
          if (technicianRef.current || bootstrapRunIdRef.current > 0) return;
        }
        // Skip ALL redundant events when already authenticated (except SIGNED_OUT)
        if (technicianRef.current && event !== 'SIGNED_OUT') {
          return;
        }
        await bootstrapFromSession(session, event);
      }
    );

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Login with email or phone
  const login = async (
    emailOrPhone: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

      const identifier = emailOrPhone.trim();
      const isEmail = identifier.includes("@");
      
      let authResponse;
      if (isEmail) {
        authResponse = await supabase.auth.signInWithPassword({
          email: identifier.toLowerCase(),
          password: password,
        });
      } else {
        const formattedPhone = normalizePhoneNumber(identifier);
        if (!formattedPhone) {
          return { success: false, error: "يرجى إدخال رقم هاتف صحيح" };
        }

        authResponse = await supabase.auth.signInWithPassword({
          phone: formattedPhone,
          password: password,
        });
      }

      const { data, error } = authResponse;

      if (error) {
        setIsLoading(false);
        return {
          success: false,
          error: "البريد الإلكتروني أو رقم الهاتف أو كلمة المرور غير صحيحة",
        };
      }

      return { success: true };
    } catch (error) {
      logger.error("Login error", sanitizeError(error), 'auth');
      setIsLoading(false);
      return { success: false, error: "حدث خطأ أثناء تسجيل الدخول" };
    }
    // NOTE: Do NOT setIsLoading(false) on success here.
    // The onAuthStateChange listener will trigger bootstrapFromSession,
    // which manages isLoading lifecycle for the profile fetch.
  };

    const logout = async (): Promise<void> => {
      try {
        await supabase.auth.signOut();
        technicianRef.current = null;
        setTechnician(null);
      } catch (error) {
      logger.error("Logout error", error, 'auth');
    }
  };

return (
    <TechnicianAuthContext.Provider
      value={{
        technician,
        isAuthenticated: !!technician,
        isLoading,
        authBootstrapError,
        login,
        logout,
        retryAuthBootstrap,
      }}
    >
      {children}
    </TechnicianAuthContext.Provider>
  );
};

export const useTechnicianAuth = (): TechnicianAuthContextType => {
  const context = useContext(TechnicianAuthContext);
  if (!context) {
    throw new Error(
      "useTechnicianAuth must be used within TechnicianAuthProvider",
    );
  }
  return context;
};
