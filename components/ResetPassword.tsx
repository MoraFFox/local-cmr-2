import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { logger } from "../utils/logger";
import {
  LockClosedIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import Button from "./ui/Button";
import { useT } from "../utils/i18n";

interface ResetPasswordProps {
  onBack?: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ onBack }) => {
  const t = useT();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  // Check if we have a valid session from the password reset link
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      
      if (session) {
        setIsValidSession(true);
      } else {
        // Listen for auth state changes (Supabase exchanges the token)
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event) => {
          if (event === "PASSWORD_RECOVERY") {
            setIsValidSession(true);
          }
        });

        // Also check after a short delay in case the exchange happened
        setTimeout(async () => {
          const {
            data: { session: newSession },
          } = await supabase.auth.getSession();
          if (newSession) {
            setIsValidSession(true);
          }
        }, 1000);

        return () => {
          subscription.unsubscribe();
        };
      }
    };

    checkSession();
  }, []);

  const validatePassword = (password: string): boolean => {
    return password.length >= 8;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!newPassword.trim()) {
      setError(t.ui.adminAuth.newPasswordEmptyError);
      return;
    }

    if (!validatePassword(newPassword)) {
      setError(
        t.ui.adminAuth.passwordTooShortError
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t.ui.adminAuth.passwordsMismatchError);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        logger.error("Password update error", updateError, "auth");
        setError(
          t.ui.adminAuth.resetFailedError
        );
      } else {
        setIsSuccess(true);
        // Sign out after successful password reset
        await supabase.auth.signOut();
      }
    } catch (submitError) {
      logger.error("Password reset exception", submitError, "auth");
      setError(
        t.ui.adminAuth.genericError
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    if (onBack) {
      onBack();
    } else {
      window.location.href = "/";
    }
  };

  // Loading state while checking session
  if (isValidSession === null) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-primary font-medium">
            {t.ui.adminAuth.checkingLink}
          </p>
        </div>
      </div>
    );
  }

  // Invalid session state
  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-cream border border-hairline shadow-sm p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-ember-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExclamationCircleIcon className="w-8 h-8 text-ember-500" />
            </div>
            <h1 className="text-2xl font-bold text-primary mb-2">
              {t.ui.adminAuth.invalidOrExpiredLinkTitle}
            </h1>
            <p className="text-latte mb-6">
              {t.ui.adminAuth.invalidOrExpiredLinkMessage}
            </p>
            <Button
              onClick={handleBackToLogin}
              className="w-full"
            >
              {t.ui.adminAuth.backToLogin}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-cream border border-hairline shadow-sm p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-cream-2 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="w-8 h-8 text-leaf-500" />
            </div>
            <h1 className="text-2xl font-bold text-primary mb-2">
              {t.ui.adminAuth.passwordResetSuccessTitle}
            </h1>
            <p className="text-latte mb-6">
              {t.ui.adminAuth.passwordResetSuccessMessage}
            </p>
            <Button
              onClick={handleBackToLogin}
              className="w-full"
            >
              {t.ui.adminAuth.backToLogin}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Password reset form
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-cream border border-hairline shadow-sm p-8">
        {/* Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="mb-6 flex items-center gap-2 text-latte hover:text-primary transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>{t.ui.adminAuth.backToLogin}</span>
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-cream-2 rounded-full flex items-center justify-center mx-auto mb-4">
            <LockClosedIcon className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-primary mb-2">
            {t.ui.adminAuth.forgotTitle}
          </h1>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg border border-primary/30 bg-ember-500/20 text-sm text-ember-700 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              {t.ui.adminAuth.newPasswordLabel}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 end-0 pe-3 flex items-center pointer-events-none">
                <LockClosedIcon className="w-5 h-5 text-latte" />
              </div>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pe-14 ps-4 py-3 rounded-lg bg-cream border border-hairline text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              {t.ui.adminAuth.confirmNewPasswordLabel}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 end-0 pe-3 flex items-center pointer-events-none">
                <LockClosedIcon className="w-5 h-5 text-latte" />
              </div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pe-14 ps-4 py-3 rounded-lg bg-cream border border-hairline text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                dir="ltr"
              />
            </div>
          </div>

          <Button
            type="submit"
            isLoading={isSubmitting}
            className="w-full py-3"
          >
            {t.ui.adminAuth.resetPasswordButton}
          </Button>
        </form>
      </div>
    </div>
  );
};
export default ResetPassword;
