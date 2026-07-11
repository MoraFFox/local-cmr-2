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
import Button from "./ui/Button";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-cream shadow-lg p-6 relative border border-hairline">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-latte hover:text-primary hover:bg-cream-2 transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-cream-2 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="w-7 h-7 text-leaf-500" />
            </div>
            <h2 className="text-xl font-bold font-display text-ink mb-2">
              تحقق من بريدك الإلكتروني
            </h2>
            <p className="text-latte mb-2">
              تحقق من بريدك الإلكتروني
            </p>
            <p className="text-sm text-latte mb-6">
              لقد أرسلنا رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.
            </p>
            <Button
              onClick={handleClose}
              className="w-full"
            >
              العودة لتسجيل الدخول
            </Button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-cream-2 rounded-full flex items-center justify-center mx-auto mb-4">
                <EnvelopeIcon className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-xl font-bold font-display text-ink mb-2">
                إعادة تعيين كلمة المرور
              </h2>
              <p className="text-latte">
                إعادة تعيين كلمة المرور
              </p>
            </div>

            <p className="text-sm text-latte text-center mb-4">
              أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg border border-ember-500/30 bg-ember-50 text-sm text-ember-700 text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-2">
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="w-5 h-5 text-latte" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="input-base pr-10"
                    dir="ltr"
                  />
                </div>
              </div>

              <Button
                type="submit"
                isLoading={isSubmitting}
                className="w-full"
              >
                إرسال رابط إعادة التعيين
              </Button>
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
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      {/* Login card — cream surface on paper background */}
      <div className="w-full max-w-md rounded-2xl bg-cream border border-hairline shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-cream-2 rounded-full flex items-center justify-center mx-auto mb-4">
            {contactType === "email" ? (
              <EnvelopeIcon className="w-8 h-8 text-primary" />
            ) : (
              <PhoneIcon className="w-8 h-8 text-primary" />
            )}
          </div>
          <h1 className="text-2xl font-bold font-display text-ink mb-2">
            تسجيل دخول الإدارة
          </h1>
          <p className="text-latte">
            تسجيل دخول الإدارة
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg border border-ember-500/30 bg-ember-50 text-sm text-ember-700 text-center">
            {error}
          </div>
        )}

        {/* Contact Type Toggle — segmented control on cream-2 track */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-ink mb-2 text-center">
            البريد أو الهاتف
          </label>
          <div className="flex rounded-lg bg-cream-2 p-1">
            <button
              type="button"
              onClick={() => setContactType("email")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                contactType === "email"
                  ? "bg-cream shadow-sm text-ink"
                  : "text-latte hover:text-primary"
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
                  ? "bg-cream shadow-sm text-ink"
                  : "text-latte hover:text-primary"
              }`}
            >
              <PhoneIcon className="w-4 h-4" />
              <span>الهاتف</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              {getLabel()}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                {contactType === "email" ? (
                  <EnvelopeIcon className="w-5 h-5 text-latte" />
                ) : (
                  <PhoneIcon className="w-5 h-5 text-latte" />
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
                className="input-base pr-10"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              كلمة المرور
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <LockClosedIcon className="w-5 h-5 text-latte" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-base pr-10"
                dir="ltr"
              />
            </div>
          </div>

          {/* Primary CTA — crema→copper gradient */}
          <Button
            type="submit"
            isLoading={isSubmitting || isLoading}
            className="btn-primary w-full"
          >
            تسجيل الدخول
          </Button>

          {/* Forgot Password Link */}
          {contactType === "email" && (
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-primary hover:text-primary transition-colors"
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
