import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { logger } from "../utils/logger";
import {
  LockClosedIcon,
  EnvelopeIcon,
  PhoneIcon,
  XMarkIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface AdminLoginProps {
  isLoading?: boolean;
}

type ContactType = "email" | "phone";

// Forgot Password Modal Component
interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("يرجى إدخال بريدك الإلكتروني.");
      return;
    }
    if (!validateEmail(normalizedEmail)) {
      setError("يرجى إدخال بريد إلكتروني صحيح.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (resetError) {
        logger.error("Password reset error", resetError, "auth");
        setError(
          "فشل إرسال رابط إعادة التعيين. يرجى المحاولة مرة أخرى."
        );
      } else {
        setIsSuccess(true);
      }
    } catch (submitError) {
      logger.error("Password reset exception", submitError, "auth");
      setError(
        "حدث خطأ. يرجى المحاولة مرة أخرى."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setError("");
    setIsSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 shadow-2xl p-6 relative">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="w-7 h-7 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              تحقق من بريدك الإلكتروني
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-2">
              تحقق من بريدك الإلكتروني
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              لقد أرسلنا رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.
            </p>
            <button
              onClick={handleClose}
              className="w-full py-3 rounded-lg font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors"
            >
              العودة لتسجيل الدخول
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <EnvelopeIcon className="w-7 h-7 text-teal-600 dark:text-teal-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                إعادة تعيين كلمة المرور
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                إعادة تعيين كلمة المرور
              </p>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-4">
              أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300 text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="w-5 h-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    autoCapitalize="none"
                    autoCorrect="off"
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
                  ? "جاري الإرسال..."
                  : "إرسال رابط إعادة التعيين"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

const AdminLogin: React.FC<AdminLoginProps> = ({ isLoading = false }) => {
  const [contactType, setContactType] = useState<ContactType>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    // Basic phone validation - allows various formats
    const phoneRegex = /^[+]?[\d\s-]{7,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ""));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedPassword = password.trim();

    if (contactType === "email") {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail || !trimmedPassword) {
        setError("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
        return;
      }
      if (!validateEmail(normalizedEmail)) {
        setError("يرجى إدخال بريد إلكتروني صحيح.");
        return;
      }

      setIsSubmitting(true);
      try {
          const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password: trimmedPassword,
          });

          if (signInError) {
            setError("بيانات تسجيل الدخول غير صحيحة.");
          } else {
            window.location.href = '/';
          }
        } catch (submitError) {
          logger.error("Admin login exception", submitError, "auth");
        setError("فشل تسجيل الدخول، حاول مرة أخرى.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Phone login
      const normalizedPhone = phone.trim();
      if (!normalizedPhone || !trimmedPassword) {
        setError("يرجى إدخال رقم الهاتف وكلمة المرور.");
        return;
      }
      if (!validatePhone(normalizedPhone)) {
        setError("يرجى إدخال رقم هاتف صحيح.");
        return;
      }

      setIsSubmitting(true);
      try {
        logger.debug("Attempting login with phone", { phone: normalizedPhone }, 'auth');
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          phone: normalizedPhone,
          password: trimmedPassword,
        });

        if (signInError) {
          logger.error("Phone sign in error", signInError, 'auth');
          setError("بيانات تسجيل الدخول غير صحيحة.");
        } else {
          logger.debug("Phone sign in successful", { 
            userId: data.user?.id, 
            phone: data.user?.phone,
            sessionExists: !!data.session,
            appMetadata: data.user?.app_metadata,
            userMetadata: data.user?.user_metadata
          }, 'auth');
          window.location.href = '/';
        }
      } catch (submitError) {
        logger.error("Phone admin login exception", submitError, 'auth');
        setError("فشل تسجيل الدخول، حاول مرة أخرى.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const getPlaceholder = () => {
    if (contactType === "email") {
      return "admin@example.com";
    }
    return "+201234567890";
  };

  const getInputType = () => {
    return contactType === "email" ? "email" : "tel";
  };

  const getLabel = () => {
    if (contactType === "email") {
      return "البريد الإلكتروني";
    }
    return "الهاتف";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-teal-50 dark:from-slate-900 dark:to-teal-900/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            {contactType === "email" ? (
              <EnvelopeIcon className="w-8 h-8 text-teal-600 dark:text-teal-400" />
            ) : (
              <PhoneIcon className="w-8 h-8 text-teal-600 dark:text-teal-400" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            تسجيل دخول الإدارة
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            تسجيل دخول الإدارة
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300 text-center">
            {error}
          </div>
        )}

        {/* Contact Type Toggle */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 text-center">
            البريد أو الهاتف
          </label>
          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-700 p-1">
            <button
              type="button"
              onClick={() => setContactType("email")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                contactType === "email"
                  ? "bg-white dark:bg-slate-600 text-teal-600 dark:text-teal-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <EnvelopeIcon className="w-4 h-4" />
              <span>البريد الإلكتروني</span>
            </button>
            <button
              type="button"
              onClick={() => setContactType("phone")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                contactType === "phone"
                  ? "bg-white dark:bg-slate-600 text-teal-600 dark:text-teal-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <PhoneIcon className="w-4 h-4" />
              <span>الهاتف</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {getLabel()}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                {contactType === "email" ? (
                  <EnvelopeIcon className="w-5 h-5 text-slate-400" />
                ) : (
                  <PhoneIcon className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <input
                type={getInputType()}
                inputMode={contactType === "phone" ? "tel" : undefined}
                value={contactType === "email" ? email : phone}
                onChange={(e) => {
                  if (contactType === "email") {
                    setEmail(e.target.value);
                  } else {
                    setPhone(e.target.value);
                  }
                }}
                placeholder={getPlaceholder()}
                autoCapitalize="none"
                autoCorrect="off"
                className="w-full pr-10 pl-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              كلمة المرور
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <LockClosedIcon className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pr-10 pl-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                dir="ltr"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="w-full py-3 rounded-lg font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting || isLoading
              ? "جاري تسجيل الدخول..."
              : "تسجيل الدخول"}
          </button>

          {/* Forgot Password Link */}
          {contactType === "email" && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
              >
                نسيت كلمة المرور؟
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  );
};

export default AdminLogin;
