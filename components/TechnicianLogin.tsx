import React, { useState } from "react";
import { useTechnicianAuth } from "./TechnicianAuthContext";
import { supabase } from "../supabaseClient";
import { useT } from "../utils/i18n";
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
  const t = useT();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError(t.ui.login.enterEmailRequired);
      return;
    }
    if (!validateEmail(normalizedEmail)) {
      setError(t.ui.login.enterValidEmail);
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
        setError(t.ui.login.resetLinkFailed);
      } else {
        setIsSuccess(true);
      }
    } catch (submitError) {
      logger.error("Password reset exception", submitError, "auth");
      setError(t.ui.login.genericError);
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
      <div className="w-full max-w-md rounded-2xl bg-cream shadow-sm p-6 relative border border-hairline">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 start-4 p-2 rounded-lg text-latte hover:text-primary hover:bg-cream-2 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-cream-2 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="w-7 h-7 text-leaf-500" />
            </div>
            <h2 className="text-xl font-bold text-primary mb-2">
              {t.ui.login.checkYourEmail}
            </h2>
            <p className="text-sm text-latte mb-6">
              {t.ui.login.resetLinkSent}
            </p>
            <Button
              onClick={handleClose}
              className="w-full"
            >
              {t.ui.login.backToLogin}
            </Button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-cream-2 rounded-full flex items-center justify-center mx-auto mb-4">
                <EnvelopeIcon className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-primary mb-2">
                {t.ui.login.resetPasswordTitle}
              </h2>
            </div>

            <p className="text-sm text-latte text-center mb-4">
              {t.ui.login.resetPasswordHint}
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg border border-primary/30 bg-ember-500/20 text-sm text-ember-700 text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2 text-end">
                  {t.ui.details.email}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 end-0 pe-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="w-5 h-5 text-latte" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="w-full pe-14 ps-4 py-3 rounded-lg bg-cream-2 border border-hairline text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-end"
                    dir="ltr"
                  />
                </div>
              </div>

              <Button
                type="submit"
                isLoading={isSubmitting}
                className="w-full"
              >
                {t.ui.login.sendResetLink}
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
  const t = useT();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const identifier = contactType === "email" ? email.trim() : phone.trim();

    if (!identifier || !password.trim()) {
      setError(contactType === "email"
        ? t.ui.login.emailPasswordRequired
        : t.ui.login.phonePasswordRequired);
      return;
    }

    const rawIdentifier = normalizeDigits(identifier);
    const rateLimitKey = getRateLimitKey(rawIdentifier);

    const rateCheck = authRateLimiter.check(rateLimitKey);
    if (!rateCheck.allowed) {
      setError(rateCheck.message || t.ui.login.tooManyAttempts);
      return;
    }

    const sanitizedIdentifier = rawIdentifier.includes("@")
      ? sanitizeString(rawIdentifier.toLowerCase())
      : sanitizeString(rawIdentifier);

    const result = await login(sanitizedIdentifier, password);
    if (!result.success) {
      setError(result.error || t.ui.login.loginError);
    } else {
      authRateLimiter.reset(rateLimitKey);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="mb-6 flex items-center gap-2 text-latte hover:text-primary transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>{t.ui.login.backToMainApp}</span>
          </button>
        )}

        {/* Login Card */}
        <div className="bg-cream border border-hairline rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-cream-2 rounded-full flex items-center justify-center mx-auto mb-4">
              {contactType === "email" ? (
                <EnvelopeIcon className="w-8 h-8 text-primary" />
              ) : (
                <PhoneIcon className="w-8 h-8 text-primary" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-primary mb-2">
              {t.login.title}
            </h1>
            <p className="text-latte">
              {t.login.subtitle}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-ember-500/20 border border-primary/30 rounded-lg">
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
                {t.ui.login.emailOrPhone}
              </label>
              <div className="flex rounded-lg bg-cream-2 p-1">
                <button
                  type="button"
                  onClick={() => setContactType("email")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all min-h-[44px] ${
                    contactType === "email"
                      ? "bg-cream text-primary shadow-sm"
                      : "text-latte hover:text-primary"
                  }`}
                >
                  <EnvelopeIcon className="w-4 h-4" />
                  <span>{t.ui.login.emailShort}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setContactType("phone")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all min-h-[44px] ${
                    contactType === "phone"
                      ? "bg-cream text-primary shadow-sm"
                      : "text-latte hover:text-primary"
                  }`}
                >
                  <PhoneIcon className="w-4 h-4" />
                  <span>{t.ui.login.phoneShort}</span>
                </button>
              </div>
            </div>

            {/* Email/Phone Field */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                {contactType === "email" ? t.ui.details.email : t.ui.wizard.phoneLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 end-0 pe-3 flex items-center pointer-events-none">
                  {contactType === "email" ? (
                    <EnvelopeIcon className="h-5 w-5 text-latte" />
                  ) : (
                    <PhoneIcon className="h-5 w-5 text-latte" />
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
                  className="block w-full pe-14 ps-4 py-3 bg-cream text-primary rounded-lg border border-hairline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-end"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                {t.login.passwordLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 end-0 pe-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-latte" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.login.passwordPlaceholder}
                  className="block w-full pe-14 ps-4 py-3 bg-cream text-primary rounded-lg border border-hairline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-end"
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
              {isLoading ? t.login.loggingIn : t.login.loginButton}
            </Button>

            {/* Forgot Password Link */}
            {contactType === "email" && (
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-primary hover:text-primary transition-colors min-h-[44px] px-2"
                >
                  {t.ui.login.forgotPassword}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-sm text-latte">
          {t.ui.login.portalFooter}
        </p>

        {/* Invite-Only Message */}
        <div className="mt-4 p-3 bg-cream-2 rounded-lg border border-hairline">
          <div className="flex ltr:items-start rtl:items-end gap-2">
            <InformationCircleIcon className="w-5 h-5 text-latte flex-shrink-0 mt-0.5" />
            <div className="text-sm text-latte">
              <p className="font-medium">{t.ui.login.inviteOnly}</p>
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
