import React, { useState, useEffect } from 'react';
import {
  UserIcon,
  LockClosedIcon,
  EnvelopeIcon,
  PhoneIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
  WrenchScrewdriverIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { InviteValidationResponse, InviteRedeemResponse, InviteRole } from '../types';
import { logger } from '../utils/logger';

// ============================================
// Bilingual Copy
// ============================================
const copy = {
  en: {
    title: 'قبول الدعوة',
    subtitle: 'لقد تمت دعوتك للانضمام كـ',
    formTitle: 'إنشاء حسابك',
    nameLabel: 'الاسم',
    namePlaceholder: 'أدخل اسمك',
    emailLabel: 'البريد الإلكتروني',
    phoneLabel: 'رقم الهاتف',
    passwordLabel: 'كلمة المرور',
    passwordPlaceholder: 'أدخل كلمة المرور',
    confirmPasswordLabel: 'تأكيد كلمة المرور',
    confirmPasswordPlaceholder: 'تأكيد كلمة المرور',
    submitButton: 'إنشاء الحساب',
    backButton: 'العودة لتسجيل الدخول',
    invalidInvite: 'الدعوة غير صالحة أو منتهية',
    passwordMismatch: 'كلمات المرور غير متطابقة',
    passwordTooShort: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل',
    nameRequired: 'الاسم مطلوب',
    creating: 'جاري إنشاء الحساب...',
    validating: 'جاري التحقق من الدعوة...',
    networkError: 'خطأ في الشبكة. يرجى المحاولة مرة أخرى.',
    emailRequired: 'البريد الإلكتروني مطلوب لهذه الدعوة',
    emailInvalid: 'يرجى إدخال بريد إلكتروني صحيح',
    genericInviteNotice: 'هذه دعوة عامة. أدخل بريدك الإلكتروني للمتابعة.',
    admin: 'مدير',
    technician: 'فني',
  },
  ar: {
    title: 'قبول الدعوة',
    subtitle: 'لقد تمت دعوتك للانضمام كـ',
    formTitle: 'إنشاء حسابك',
    nameLabel: 'الاسم',
    namePlaceholder: 'أدخل اسمك',
    emailLabel: 'البريد الإلكتروني',
    phoneLabel: 'رقم الهاتف',
    passwordLabel: 'كلمة المرور',
    passwordPlaceholder: 'أدخل كلمة المرور',
    confirmPasswordLabel: 'تأكيد كلمة المرور',
    confirmPasswordPlaceholder: 'تأكيد كلمة المرور',
    submitButton: 'إنشاء الحساب',
    backButton: 'العودة لتسجيل الدخول',
    invalidInvite: 'الدعوة غير صالحة أو منتهية',
    passwordMismatch: 'كلمات المرور غير متطابقة',
    passwordTooShort: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل',
    nameRequired: 'الاسم مطلوب',
    creating: 'جاري إنشاء الحساب...',
    validating: 'جاري التحقق من الدعوة...',
    networkError: 'خطأ في الشبكة. يرجى المحاولة مرة أخرى.',
    emailRequired: 'البريد الإلكتروني مطلوب لهذه الدعوة',
    emailInvalid: 'يرجى إدخال بريد إلكتروني صحيح',
    genericInviteNotice: 'هذه دعوة عامة. أدخل بريدك الإلكتروني للمتابعة.',
    admin: 'مدير',
    technician: 'فني',
  },
};

// ============================================
// Props Interface
// ============================================
interface InviteSignupProps {
  role: InviteRole; // Expected role from route
  token: string; // Token from URL query param
  onSuccess: (user: { id: string; role: string }) => void; // Callback after successful signup
  onBack: () => void; // Callback to go back to login
}

// ============================================
// Password Strength Indicator
// ============================================
interface PasswordStrengthProps {
  password: string;
  lang: 'en' | 'ar';
}

const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password, lang }) => {
  const getStrength = (pwd: string): { score: number; label: string; color: string } => {
    if (!pwd) return { score: 0, label: '', color: '' };
    
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score: 1, label: 'ضعيفة', color: 'bg-red-500' };
    if (score <= 4) return { score: 2, label: 'متوسطة', color: 'bg-yellow-500' };
    return { score: 3, label: 'قوية', color: 'bg-green-500' };
  };

  const strength = getStrength(password);
  
  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              level <= strength.score ? strength.color : 'bg-slate-200 dark:bg-slate-700'
            }`}
          />
        ))}
      </div>
      {strength.label && (
        <p className={`text-xs ${
          strength.score === 1 ? 'text-red-500' : 
          strength.score === 2 ? 'text-yellow-500' : 'text-green-500'
        }`}>
          {strength.label}
        </p>
      )}
    </div>
  );
};

// ============================================
// Main Component
// ============================================
const InviteSignup: React.FC<InviteSignupProps> = ({
  role,
  token,
  onSuccess,
  onBack,
}) => {
  // State
  const [lang, setLang] = useState<'en' | 'ar'>('ar');
  const [isValidating, setIsValidating] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Invite data from validation
  const [inviteData, setInviteData] = useState<{
    role: InviteRole;
    email: string | null;
    phone: string | null;
    name: string | null;
  } | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Get Supabase URL from environment
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  // ============================================
  // Validate Token on Mount
  // ============================================
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setValidationError(copy[lang].invalidInvite);
        setIsValidating(false);
        return;
      }

      try {
        const response = await fetch(
          `${supabaseUrl}/functions/v1/invite-signup?action=validate`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          }
        );

        const data: InviteValidationResponse = await response.json();

        if (!data.valid) {
          setValidationError(data.errorAr || data.error || copy[lang].invalidInvite);
        } else if (data.invite && data.invite.role !== role) {
          // Role mismatch - show error
          setValidationError(
            lang === 'ar'
              ? `هذه الدعوة مخصصة لدور مختلف (${data.invite.role === 'admin' ? 'مدير' : 'فني'})`
              : `هذه الدعوة مخصصة لدور مختلف (${data.invite.role === 'admin' ? 'مدير' : 'فني'})`
          );
        } else if (data.invite) {
          setInviteData(data.invite);
          setName(data.invite.name || '');
          setEmail(data.invite.email || '');
        }
      } catch (error) {
        logger.error('Token validation error', error, 'auth');
        setValidationError(copy[lang].networkError);
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token, role, supabaseUrl, lang]);

  // ============================================
  // Form Submission
  // ============================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const requiresEmail = !inviteData?.email && !inviteData?.phone;
    const normalizedEmail = email.trim().toLowerCase();

    // Validation
    if (!name.trim()) {
      setFormError(copy[lang].nameRequired);
      return;
    }

    if (password.length < 8) {
      setFormError(copy[lang].passwordTooShort);
      return;
    }

    if (password !== confirmPassword) {
      setFormError(copy[lang].passwordMismatch);
      return;
    }

    if (requiresEmail && !normalizedEmail) {
      setFormError(copy[lang].emailRequired);
      return;
    }

    if (requiresEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setFormError(copy[lang].emailInvalid);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/invite-signup?action=redeem`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            password,
            name: name.trim(),
            email: requiresEmail ? normalizedEmail : undefined,
          }),
        }
      );

      const data: InviteRedeemResponse = await response.json();

      if (!data.success) {
        setFormError(data.errorAr || data.error || copy[lang].networkError);
      } else if (data.user) {
        onSuccess(data.user);
      }
    } catch (error) {
      logger.error('Redemption error', error, 'auth');
      setFormError(copy[lang].networkError);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // Loading State
  // ============================================
  if (isValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">{copy[lang].validating}</p>
        </div>
      </div>
    );
  }

  // ============================================
  // Invalid Invite State
  // ============================================
  if (validationError || !inviteData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExclamationCircleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {copy[lang].invalidInvite}
            </h1>
            {validationError && (
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                {validationError}
              </p>
            )}
            <button
              onClick={onBack}
              className="flex items-center justify-center gap-2 mx-auto text-teal-600 dark:text-teal-400 font-medium hover:underline"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              {copy[lang].backButton}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // Role Badge Component
  // ============================================
  const RoleBadge = () => {
    const isAdmin = inviteData.role === 'admin';
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
          isAdmin
            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
            : 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
        }`}
      >
        {isAdmin ? (
          <ShieldCheckIcon className="w-4 h-4" />
        ) : (
          <WrenchScrewdriverIcon className="w-4 h-4" />
        )}
        {isAdmin ? copy[lang].admin : copy[lang].technician}
      </span>
    );
  };

  // ============================================
  // Main Form
  // ============================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Language Toggle */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            {lang === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 dark:border-slate-700/50 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              inviteData.role === 'admin'
                ? 'bg-purple-100 dark:bg-purple-900/30'
                : 'bg-teal-100 dark:bg-teal-900/30'
            }`}>
              {inviteData.role === 'admin' ? (
                <ShieldCheckIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              ) : (
                <WrenchScrewdriverIcon className="w-8 h-8 text-teal-600 dark:text-teal-400" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {copy[lang].title}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 flex items-center justify-center gap-2 flex-wrap">
              {copy[lang].subtitle} <RoleBadge />
            </p>
          </div>

          {/* Pre-filled Contact Info (Read-only) */}
          {(inviteData.email || inviteData.phone) ? (
            <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg space-y-2">
              {inviteData.email && (
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <EnvelopeIcon className="w-4 h-4 text-slate-400" />
                  <span dir="ltr">{inviteData.email}</span>
                </div>
              )}
              {inviteData.phone && (
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <PhoneIcon className="w-4 h-4 text-slate-400" />
                  <span dir="ltr">{inviteData.phone}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-300">
              {copy[lang].genericInviteNotice}
            </div>
          )}

          {/* Form Title */}
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
            {copy[lang].formTitle}
          </h2>

          {/* Error Message */}
          {formError && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400 text-center">
                {formError}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {copy[lang].nameLabel}
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${lang === 'ar' ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                  <UserIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={copy[lang].namePlaceholder}
                  className={`block w-full ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-600 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all`}
                  dir={lang === 'ar' ? 'rtl' : 'ltr'}
                />
              </div>
            </div>

            {/* Email Field for Generic Invites */}
            {!inviteData.email && !inviteData.phone && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {copy[lang].emailLabel}
                </label>
                <div className="relative">
                  <div className={`absolute inset-y-0 ${lang === 'ar' ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                    <EnvelopeIcon className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className={`block w-full ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-600 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all`}
                    dir="ltr"
                  />
                </div>
              </div>
            )}

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {copy[lang].passwordLabel}
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${lang === 'ar' ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                  <LockClosedIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={copy[lang].passwordPlaceholder}
                  className={`block w-full ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-600 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all`}
                  dir="ltr"
                />
              </div>
              <PasswordStrength password={password} lang={lang} />
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {copy[lang].confirmPasswordLabel}
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${lang === 'ar' ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                  {password && confirmPassword && password === confirmPassword ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  ) : (
                    <LockClosedIcon className="h-5 w-5 text-slate-400" />
                  )}
                </div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={copy[lang].confirmPasswordPlaceholder}
                  className={`block w-full ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg border ${
                    password && confirmPassword && password !== confirmPassword
                      ? 'border-red-300 dark:border-red-600'
                      : 'border-slate-200 dark:border-slate-600'
                  } focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all`}
                  dir="ltr"
                />
              </div>
              {password && confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-xs text-red-500">
                  {copy[lang].passwordMismatch}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed ${
                inviteData.role === 'admin'
                  ? 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400'
                  : 'bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400'
              } text-white`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {copy[lang].creating}
                </span>
              ) : (
                copy[lang].submitButton
              )}
            </button>
          </form>

          {/* Back Button */}
          <div className="mt-6 text-center">
            <button
              onClick={onBack}
              className="flex items-center justify-center gap-2 mx-auto text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeftIcon className={`w-4 h-4 ${lang === 'ar' ? '' : 'rotate-180'}`} />
              {copy[lang].backButton}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteSignup;
