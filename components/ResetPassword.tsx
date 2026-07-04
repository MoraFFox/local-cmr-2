import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { logger } from "../utils/logger";
import {
  LockClosedIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";

interface ResetPasswordProps {
  onBack?: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ onBack }) => {
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
      setError("يرجى إدخال كلمة مرور جديدة.");
      return;
    }

    if (!validatePassword(newPassword)) {
      setError(
        "يجب أن تكون كلمة المرور 8 أحرف على الأقل."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("كلمات المرور غير متطابقة.");
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
          "          فشل إعادة تعيين كلمة المرور. يرجى المحاولة مرة أخرى."
        );
      } else {
        setIsSuccess(true);
        // Sign out after successful password reset
        await supabase.auth.signOut();
      }
    } catch (submitError) {
      logger.error("Password reset exception", submitError, "auth");
      setError(
        "        حدث خطأ. يرجى المحاولة مرة أخرى."
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
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-teal-50 dark:from-slate-900 dark:to-teal-900/20 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-700 dark:text-slate-300 font-medium">
            جاري التحقق من الرابط...
          </p>
        </div>
      </div>
    );
  }

  // Invalid session state
  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-teal-50 dark:from-slate-900 dark:to-teal-900/20 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-black/5 dark:border-white/10 shadow-sm p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExclamationCircleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              رابط غير صالح أو منتهي الصلاحية
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              رابط إعادة تعيين كلمة المرور هذا غير صالح أو منتهي الصلاحية. يرجى طلب رابط جديد.
            </p>
            <button
              onClick={handleBackToLogin}
              className="w-full py-3 rounded-lg font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors"
            >
              العودة لتسجيل الدخول
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-teal-50 dark:from-slate-900 dark:to-teal-900/20 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-black/5 dark:border-white/10 shadow-sm p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              تم إعادة تعيين كلمة المرور بنجاح!
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              يرجى تسجيل الدخول بكلمة المرور الجديدة.
            </p>
            <button
              onClick={handleBackToLogin}
              className="w-full py-3 rounded-lg font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors"
            >
              العودة لتسجيل الدخول
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Password reset form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-teal-50 dark:from-slate-900 dark:to-teal-900/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-black/5 dark:border-white/10 shadow-sm p-8">
        {/* Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="mb-6 flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>العودة لتسجيل الدخول</span>
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <LockClosedIcon className="w-8 h-8 text-teal-600 dark:text-teal-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            إعادة تعيين كلمة المرور
          </h1>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              كلمة المرور الجديدة
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <LockClosedIcon className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pr-10 pl-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              تأكيد كلمة المرور الجديدة
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <LockClosedIcon className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pr-10 pl-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                dir="ltr"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-lg font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting
              ? "جاري إعادة التعيين..."
              : "إعادة تعيين كلمة المرور"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
