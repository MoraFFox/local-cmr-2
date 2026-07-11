import React, { useState } from "react";
import { useTechnicianAuth } from "./TechnicianAuthContext";
import { supabase } from "../supabaseClient";
import { ar } from "../utils/arabicTranslations";
import { authRateLimiter } from "../utils/rateLimiter";
import { sanitizeString } from "../utils/sanitization";
import { logger } from "../utils/logger";
import {
  LockClosedIcon,
  ArrowLeftIcon,
  InformationCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  XMarkIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import Button from "./ui/Button";

interface TechnicianLoginProps {
  onBack?: () => void;
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
        setError("فشل إرسال رابط إعادة التعيين. يرجى المحاولة مرة أخرى.");
      } else {
        setIsSuccess(true);
      }
    } catch (submitError) {
      logger.error("Password reset exception", submitError, "auth");
      setError("حدث خطأ. يرجى المحاولة مرة أخرى.");
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
      <div className="w-full max-w-md rounded-2xl bg-surface shadow-sm p-6 relative border border-default">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 left-4 p-1 rounded-lg text-secondary hover:text-primary hover:bg-surface-elevated transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-surface-elevated rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="w-7 h-7 text-leaf-500" />
            </div>
            <h2 className="text-xl font-bold text-primary mb-2">
              تحقق من بريدك الإلكتروني
            </h2>
            <p className="text-sm text-secondary mb-6">
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
              <div className="w-14 h-14 bg-surface-elevated rounded-full flex items-center justify-center mx-auto mb-4">
                <EnvelopeIcon className="w-7 h-7 text-brand-red" />
              </div>
              <h2 className="text-xl font-bold text-primary mb-2">
                إعادة تعيين كلمة المرور
              </h2>
            </div>

            <p className="text-sm text-secondary text-center mb-4">
              أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg border border-copper-500/30 bg-ember-500/20 text-sm text-ember-700 text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2 text-right">
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="w-5 h-5 text-secondary" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="w-full pr-10 pl-4 py-3 rounded-lg bg-surface-elevated border border-default text-primary focus:outline-none focus:border-copper-500 focus:ring-2 focus:ring-brand-red/20 text-right"
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

const normalizeDigits = (value: string): string => {
  return value
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776));
};

const getRateLimitKey = (identifier: string): string => {
  const normalizedIdentifier = normalizeDigits(identifier.trim());
  if (normalizedIdentifier.includes("@")) {
    return normalizedIdentifier.toLowerCase();
  }

  return normalizedIdentifier.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
};

const TechnicianLogin: React.FC<TechnicianLoginProps> = ({
  onBack,
}) => {
  const { login, isLoading } = useTechnicianAuth();
  const [contactType, setContactType] = useState<ContactType>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const identifier = contactType === "email" ? email.trim() : phone.trim();

    if (!identifier || !password.trim()) {
      setError(contactType === "email"
        ? "يرجى إدخال البريد الإلكتروني وكلمة المرور"
        : "يرجى إدخال رقم الهاتف وكلمة المرور");
      return;
    }

    const rawIdentifier = normalizeDigits(identifier);
    const rateLimitKey = getRateLimitKey(rawIdentifier);

    const rateCheck = authRateLimiter.check(rateLimitKey);
    if (!rateCheck.allowed) {
      setError(rateCheck.message || "لقد تجاوزت الحد الأقصى للمحاولات");
      return;
    }

    const sanitizedIdentifier = rawIdentifier.includes("@")
      ? sanitizeString(rawIdentifier.toLowerCase())
      : sanitizeString(rawIdentifier);

    const result = await login(sanitizedIdentifier, password);
    if (!result.success) {
      setError(result.error || "حدث خطأ أثناء تسجيل الدخول");
    } else {
      authRateLimiter.reset(rateLimitKey);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="mb-6 flex items-center gap-2 text-secondary hover:text-primary transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>العودة للتطبيق الرئيسي</span>
          </button>
        )}

        {/* Login Card */}
        <div className="bg-surface border border-default rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-surface-elevated rounded-full flex items-center justify-center mx-auto mb-4">
              {contactType === "email" ? (
                <EnvelopeIcon className="w-8 h-8 text-brand-red" />
              ) : (
                <PhoneIcon className="w-8 h-8 text-brand-red" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-primary mb-2">
              {ar.login.title}
            </h1>
            <p className="text-secondary">
              {ar.login.subtitle}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-ember-500/20 border border-copper-500/30 rounded-lg">
              <p className="text-sm text-ember-700 text-center">
                {error}
              </p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contact Type Toggle */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-primary mb-2 text-center">
                البريد الإلكتروني أو الهاتف
              </label>
              <div className="flex rounded-lg bg-surface-elevated p-1">
                <button
                  type="button"
                  onClick={() => setContactType("email")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                    contactType === "email"
                      ? "bg-surface text-brand-red shadow-sm"
                      : "text-secondary hover:text-primary"
                  }`}
                >
                  <EnvelopeIcon className="w-4 h-4" />
                  <span>البريد</span>
                </button>
                <button
                  type="button"
                  onClick={() => setContactType("phone")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                    contactType === "phone"
                      ? "bg-surface text-brand-red shadow-sm"
                      : "text-secondary hover:text-primary"
                  }`}
                >
                  <PhoneIcon className="w-4 h-4" />
                  <span>الهاتف</span>
                </button>
              </div>
            </div>

            {/* Email/Phone Field */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                {contactType === "email" ? "البريد الإلكتروني" : "رقم الهاتف"}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  {contactType === "email" ? (
                    <EnvelopeIcon className="h-5 w-5 text-secondary" />
                  ) : (
                    <PhoneIcon className="h-5 w-5 text-secondary" />
                  )}
                </div>
                <input
                  type={contactType === "email" ? "email" : "tel"}
                  inputMode={contactType === "phone" ? "tel" : undefined}
                  value={contactType === "email" ? email : phone}
                  onChange={(e) => {
                    if (contactType === "email") {
                      setEmail(e.target.value);
                    } else {
                      setPhone(e.target.value);
                    }
                  }}
                  placeholder={contactType === "email" ? "example@email.com" : "01xxxxxxxxx"}
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="block w-full pr-10 pl-4 py-3 bg-surface text-primary rounded-lg border border-default focus:outline-none focus:border-copper-500 focus:ring-2 focus:ring-brand-red/20 transition-all text-right"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                {ar.login.passwordLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-secondary" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={ar.login.passwordPlaceholder}
                  className="block w-full pr-10 pl-4 py-3 bg-surface text-primary rounded-lg border border-default focus:outline-none focus:border-copper-500 focus:ring-2 focus:ring-brand-red/20 transition-all text-right"
                  dir="rtl"
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full py-3"
            >
              {isLoading ? ar.login.loggingIn : ar.login.loginButton}
            </Button>

            {/* Forgot Password Link */}
            {contactType === "email" && (
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-brand-red hover:text-brand-red transition-colors"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-sm text-secondary">
          بوابة خاصة بالفنيين لإدخال تقارير الصيانة
        </p>

        {/* Invite-Only Message */}
        <div className="mt-4 p-3 bg-surface-elevated rounded-lg border border-default">
          <div className="flex items-start gap-2">
            <InformationCircleIcon className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
            <div className="text-sm text-secondary">
              <p className="font-medium">إنشاء الحساب عبر رابط الدعوة فقط. تواصل مع المدير.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  );
};

export default TechnicianLogin;
