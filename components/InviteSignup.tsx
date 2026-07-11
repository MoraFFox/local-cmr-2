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
import Button from './ui/Button';

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

    if (score <= 2) return { score: 1, label: 'ضعيفة', color: 'bg-ember-500' };
    if (score <= 4) return { score: 2, label: 'متوسطة', color: 'bg-yellow-500' };
    return { score: 3, label: 'قوية', color: 'bg-leaf-500' };
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
              level <= strength.score ? strength.color : 'bg-cream-2 dark:bg-espresso-light'
            }`}
          />
        ))}
      </div>
      {strength.label && (
        <p className={`text-xs ${
          strength.score === 1 ? 'text-ember-500' : 
          strength.score === 2 ? 'text-yellow-500' : 'text-leaf-500'
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
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-latte">{copy[lang].validating}</p>
        </div>
      </div>
    );
  }

  // ============================================
  // Invalid Invite State
  // ============================================
  if (validationError || !inviteData) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-cream rounded-2xl shadow-xl border border-hairline p-8 text-center">
            <div className="w-16 h-16 bg-ember-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExclamationCircleIcon className="w-8 h-8 text-ember-500" />
            </div>
            <h1 className="text-xl font-bold text-ink mb-2">
              {copy[lang].invalidInvite}
            </h1>
            {validationError && (
              <p className="text-latte mb-6">
                {validationError}
              </p>
            )}
            <Button
              variant="secondary"
              onClick={onBack}
              className="w-full"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              {copy[lang].backButton}
            </Button>
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
            ? 'bg-purple-900/30 text-purple-300'
            : 'bg-primary/10 text-primary'
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
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Language Toggle */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="text-sm text-latte hover:text-primary transition-colors"
          >
            {lang === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-cream rounded-2xl shadow-xl border border-hairline p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              inviteData.role === 'admin'
                ? 'bg-purple-900/30'
                : 'bg-cream-2'
            }`}>
              {inviteData.role === 'admin' ? (
                <ShieldCheckIcon className="w-8 h-8 text-purple-400" />
              ) : (
                <WrenchScrewdriverIcon className="w-8 h-8 text-primary" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-ink mb-2">
              {copy[lang].title}
            </h1>
            <p className="text-latte flex items-center justify-center gap-2 flex-wrap">
              {copy[lang].subtitle} <RoleBadge />
            </p>
          </div>

          {/* Pre-filled Contact Info (Read-only) */}
          {(inviteData.email || inviteData.phone) ? (
            <div className="mb-6 p-4 bg-cream-2/50 rounded-lg space-y-2">
              {inviteData.email && (
                <div className="flex items-center gap-2 text-sm text-ink">
                  <EnvelopeIcon className="w-4 h-4 text-latte" />
                  <span dir="ltr">{inviteData.email}</span>
                </div>
              )}
              {inviteData.phone && (
                <div className="flex items-center gap-2 text-sm text-ink">
                  <PhoneIcon className="w-4 h-4 text-latte" />
                  <span dir="ltr">{inviteData.phone}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-6 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20 text-sm text-amber-500">
              {copy[lang].genericInviteNotice}
            </div>
          )}

          {/* Form Title */}
          <h2 className="text-lg font-semibold text-ink mb-4">
            {copy[lang].formTitle}
          </h2>

          {/* Error Message */}
          {formError && (
            <div className="mb-6 p-4 bg-ember-500/20 border border-primary/30 rounded-lg">
              <p className="text-sm text-ember-700 text-center">
                {formError}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                {copy[lang].nameLabel}
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${lang === 'ar' ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                  <UserIcon className="h-5 w-5 text-latte" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={copy[lang].namePlaceholder}
                  className={`block w-full ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 bg-cream text-ink rounded-lg border border-hairline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all`}
                  dir={lang === 'ar' ? 'rtl' : 'ltr'}
                />
              </div>
            </div>

            {/* Email Field for Generic Invites */}
            {!inviteData.email && !inviteData.phone && (
              <div>
                <label className="block text-sm font-medium text-ink mb-2">
                  {copy[lang].emailLabel}
                </label>
                <div className="relative">
                  <div className={`absolute inset-y-0 ${lang === 'ar' ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                    <EnvelopeIcon className="h-5 w-5 text-latte" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className={`block w-full ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 bg-cream text-ink rounded-lg border border-hairline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all`}
                    dir="ltr"
                  />
                </div>
              </div>
            )}

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                {copy[lang].passwordLabel}
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${lang === 'ar' ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                  <LockClosedIcon className="h-5 w-5 text-latte" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={copy[lang].passwordPlaceholder}
                  className={`block w-full ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 bg-cream text-ink rounded-lg border border-hairline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all`}
                  dir="ltr"
                />
              </div>
              <PasswordStrength password={password} lang={lang} />
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                {copy[lang].confirmPasswordLabel}
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${lang === 'ar' ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                  {password && confirmPassword && password === confirmPassword ? (
                    <CheckCircleIcon className="h-5 w-5 text-leaf-500" />
                  ) : (
                    <LockClosedIcon className="h-5 w-5 text-latte" />
                  )}
                </div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={copy[lang].confirmPasswordPlaceholder}
                  className={`block w-full ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 bg-cream text-ink rounded-lg border ${
                    password && confirmPassword && password !== confirmPassword
                      ? 'border-ember-500'
                      : 'border-hairline'
                  } focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all`}
                  dir="ltr"
                />
              </div>
              {password && confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-xs text-ember-500">
                  {copy[lang].passwordMismatch}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="w-full"
            >
              {copy[lang].submitButton}
            </Button>
          </form>

          {/* Back Button */}
          <div className="mt-6 text-center">
            <button
              onClick={onBack}
              className="flex items-center justify-center gap-2 mx-auto text-sm text-latte hover:text-primary transition-colors"
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
