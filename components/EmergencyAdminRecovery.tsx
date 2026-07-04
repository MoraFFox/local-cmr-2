import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { logger } from "../utils/logger";
import type {
  AdminRecoveryRequest,
  AdminRecoveryResponse,
} from "../types";
import {
  ArrowLeftIcon,
  ExclamationCircleIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

interface EmergencyAdminRecoveryProps {
  recoveryKey: string;
  onBack: () => void;
}

type Language = "en" | "ar";

const copy = {
  en: {
    title: "استعادة وصول المدير للطوارئ",
    subtitle: "إنشاء حساب مدير جديد",
    email: "البريد الإلكتروني",
    name: "الاسم (اختياري)",
    password: "كلمة المرور",
    confirmPassword: "تأكيد كلمة المرور",
    submit: "استعادة وصول الإدارة",
    loading: "جاري استعادة الوصول...",
    back: "العودة لتسجيل الدخول",
    required: "يرجى تعبئة جميع الحقول المطلوبة.",
    invalidEmail: "يرجى إدخال بريد إلكتروني صالح.",
    passwordShort: "يجب أن تكون كلمة المرور 8 أحرف على الأقل.",
    passwordMismatch: "كلمتا المرور غير متطابقتين.",
    networkError: "خطأ في الشبكة. يرجى المحاولة مرة أخرى.",
    loginFailed:
      "تم إنشاء الحساب ولكن فشل تسجيل الدخول التلقائي. يرجى تسجيل الدخول يدويًا.",
    success: "تمت الاستعادة بنجاح. جاري التحويل...",
  },
  ar: {
    title: "استعادة وصول المدير للطوارئ",
    subtitle: "إنشاء حساب مدير جديد",
    email: "البريد الإلكتروني",
    name: "الاسم (اختياري)",
    password: "كلمة المرور",
    confirmPassword: "تأكيد كلمة المرور",
    submit: "استعادة وصول الإدارة",
    loading: "جاري استعادة الوصول...",
    back: "العودة لتسجيل الدخول",
    required: "يرجى تعبئة جميع الحقول المطلوبة.",
    invalidEmail: "يرجى إدخال بريد إلكتروني صالح.",
    passwordShort: "يجب أن تكون كلمة المرور 8 أحرف على الأقل.",
    passwordMismatch: "كلمتا المرور غير متطابقتين.",
    networkError: "خطأ في الشبكة. يرجى المحاولة مرة أخرى.",
    loginFailed:
      "تم إنشاء الحساب ولكن فشل تسجيل الدخول التلقائي. يرجى تسجيل الدخول يدويًا.",
    success: "تمت الاستعادة بنجاح. جاري التحويل...",
  },
};

const EmergencyAdminRecovery: React.FC<EmergencyAdminRecoveryProps> = ({
  recoveryKey,
  onBack,
}) => {
  const [lang, setLang] = useState<Language>("ar");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const t = copy[lang];
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const isValidEmail = (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!normalizedEmail || !password || !confirmPassword) {
      setError(t.required);
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError(t.invalidEmail);
      return;
    }

    if (password.length < 8) {
      setError(t.passwordShort);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: AdminRecoveryRequest = {
        key: recoveryKey,
        email: normalizedEmail,
        password,
        name: trimmedName || undefined,
      };

      const response = await fetch(`${supabaseUrl}/functions/v1/admin-recovery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as AdminRecoveryResponse;
      if (!response.ok || !data.success) {
        setError(data.errorAr || data.error || t.networkError);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        setError(t.loginFailed);
        return;
      }

      setSuccessMessage(t.success);
      window.location.replace("/");
    } catch (submitError) {
      logger.error("Emergency recovery error", submitError, "auth");
      setError(t.networkError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-red-50 dark:from-slate-900 dark:to-red-900/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            {lang === "ar" ? "English" : "العربية"}
          </button>
        </div>

        <div className="rounded-2xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-black/5 dark:border-white/10 shadow-sm p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheckIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {t.title}
            </h1>
            <p className="text-slate-600 dark:text-slate-400">{t.subtitle}</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300 text-center flex items-start justify-center gap-2">
              <ExclamationCircleIcon className="w-5 h-5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-sm text-green-700 dark:text-green-300 text-center">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t.email}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <UserIcon className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@example.com"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="w-full pr-10 pl-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t.name}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <UserIcon className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="اسم المدير"
                  className="w-full pr-10 pl-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  dir={lang === "ar" ? "rtl" : "ltr"}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t.password}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="w-full pr-10 pl-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t.confirmPassword}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="••••••••"
                  className="w-full pr-10 pl-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  dir="ltr"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? t.loading : t.submit}
            </button>
          </form>

          <button
            onClick={onBack}
            className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mx-auto"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            {t.back}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmergencyAdminRecovery;
