import React, { useState, useEffect, useCallback } from 'react';
import { FormData } from '../types';
import { BuildingOfficeIcon, EnvelopeIcon, IdentificationIcon, MapPinIcon } from '@heroicons/react/24/outline';
import TextInput from './TextInput';
// NEW: Phase 1 UX fixes - auto-save, validation, and UI components
import { useAutoSave } from './forms/hooks/useAutoSave';
import { useFormValidation, ValidationPatterns } from './forms/hooks/useFormValidation';
import { AutoSaveIndicator } from './form-ui/AutoSaveIndicator';
import { ValidationSummary } from './form-ui/ValidationSummary';
import { SafeModal } from './form-ui/SafeModal';

interface CompanyEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    company: FormData | null;
    onSave: (updatedCompany: FormData) => void;
}

// Shape of the editable slice of the company form.
// The index signature lets it satisfy the `Record<string, unknown>` constraint
// required by the useAutoSave / useFormValidation hooks while keeping named fields.
interface CompanyEditableFields {
    companyName: string;
    email: string;
    taxNumber: string;
    location: string;
    [key: string]: unknown;
}

const EMPTY_FIELDS: CompanyEditableFields = {
    companyName: '',
    email: '',
    taxNumber: '',
    location: '',
};

const CompanyEditModal: React.FC<CompanyEditModalProps> = ({ isOpen, onClose, company, onSave }) => {
    const [formData, setFormData] = useState<CompanyEditableFields>(EMPTY_FIELDS);
    const [isSaving, setIsSaving] = useState(false);
    // Track whether the user has edited anything since opening (for unsaved-changes protection)
    const [isDirty, setIsDirty] = useState(false);

    // NEW: Auto-save hook - saves automatically after each change to prevent
    // data loss if the modal is closed accidentally. Keyed by company id.
    const autoSave = useAutoSave<CompanyEditableFields>(
        `company-edit-${company?.id ?? 'new'}`,
        formData,
        {
            enabled: isOpen,
        }
    );

    // NEW: Validation hook - replaces the manual validateForm function.
    const validation = useFormValidation<CompanyEditableFields>(
        formData,
        {
            companyName: { required: true, minLength: 2 },
            email: { pattern: ValidationPatterns.EMAIL },
            taxNumber: { pattern: ValidationPatterns.NUMBER },
        },
        {
            mode: 'onBlur',
            showSummary: true,
            validateOnMount: false,
        }
    );

    // Load company data (or restored draft) when the modal opens
    useEffect(() => {
        if (company && isOpen) {
            // If a draft was auto-saved for this company, restore it; otherwise load from company
            const restored = autoSave.restore() as CompanyEditableFields | null;
            const base: CompanyEditableFields = {
                companyName: company.companyName,
                email: company.email,
                taxNumber: company.taxNumber,
                location: company.location,
            };
            setFormData(restored ?? base);
            setIsDirty(restored !== null);
            validation.resetValidation();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [company, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setIsDirty(true);
        // Clear validation error for the field that changed
        validation.clearError(name);
    };

    // NEW: Enhanced handleSave using the validation hook
    const handleSave = useCallback(() => {
        validation.handleSubmit(
            // onValid
            () => {
                if (!company) return;
                setIsSaving(true);
                // Simulate async operation for better UX (preserves existing behavior)
                setTimeout(() => {
                    const updatedCompany: FormData = {
                        ...company,
                        companyName: formData.companyName || company.companyName,
                        email: formData.email || '',
                        taxNumber: formData.taxNumber || '',
                        location: formData.location || '',
                    };
                    onSave(updatedCompany);
                    // Clear the auto-saved draft since we've persisted successfully
                    autoSave.clearSaved();
                    setIsDirty(false);
                    setIsSaving(false);
                    onClose();
                }, 300);
            },
            // onInvalid
            () => {
                validation.focusNextError();
            }
        )();
    }, [validation, company, formData, onSave, autoSave, onClose]);

    // Per-input auto-save is handled by useAutoSave; the manual Ctrl/Cmd+S
    // shortcut has been removed in favor of saving after every change.

    if (!isOpen || !company) return null;

    return (
        <SafeModal
            isOpen={isOpen}
            onClose={onClose}
            // type="form" → backdrop click does NOT close (SafeModal default).
            // hasUnsavedChanges → ESC / X / Cancel show SafeModal's built-in
            // discard confirmation instead of closing immediately. This replaces
            // the modal's previous hand-rolled showDiscardConfirm logic.
            type="form"
            size="md"
            hasUnsavedChanges={isDirty}
            unsavedMessage="لديك تغييرات غير محفوظة. سيتم فقدانها إذا أغلقت النافذة. هل تريد المتابعة؟"
            ariaLabel="تعديل الشركة"
            rawContent
            renderHeader={(handleClose) => (
                <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-hairline dark:border-hairline bg-cream-2/50 dark:bg-espresso-light/30 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <BuildingOfficeIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-primary dark:text-white">
                                تعديل الشركة
                            </h2>
                            <p className="text-sm text-latte dark:text-cream/60">
                                {company.companyName || 'شركة غير مسماة'}
                            </p>
                        </div>
                    </div>
                    {/* Close button — calls SafeModal's internal handleClose so
                        the unsaved-changes protection applies. */}
                    <button
                        onClick={handleClose}
                        className="p-2 sm:p-2 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center text-latte hover:text-primary rounded-full hover:bg-cream-2 dark:hover:bg-espresso-light/50 transition-colors"
                        aria-label="إغلاق النافذة"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}
            renderFooter={(handleClose) => (
                <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 px-4 sm:px-6 py-4 pb-safe border-t border-hairline dark:border-hairline bg-cream/30 dark:bg-espresso-light/20 flex-shrink-0">
                    {/* Cancel goes through SafeModal's handleClose so the
                        unsaved-changes protection applies. */}
                    <button
                        onClick={handleClose}
                        className="w-full sm:w-auto px-4 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 text-latte hover:text-primary font-medium rounded-lg hover:bg-cream-2 dark:hover:bg-espresso-light/50 transition-colors"
                        disabled={isSaving}
                    >
                        إلغاء
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="btn-primary w-full sm:w-auto px-6 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 font-semibold flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                جارٍ الحفظ...
                            </>
                        ) : (
                            'حفظ التغييرات'
                        )}
                    </button>
                </div>
            )}
        >
            <div className="flex-1 overflow-y-auto">
                {/* NEW: Auto-save indicator */}
                <div className="px-4 sm:px-6 pt-4">
                    <AutoSaveIndicator
                        isSaving={autoSave.isSaving}
                        lastSaved={autoSave.lastSaved}
                        hasUnsavedChanges={autoSave.hasUnsavedChanges}
                        onSaveNow={autoSave.saveNow}
                        variant="compact"
                    />
                </div>

                {/* NEW: Validation summary (shows when there are errors) */}
                {validation.hasErrors && (
                    <div className="px-4 sm:px-6 pt-3">
                        <ValidationSummary
                            errors={validation.allErrors}
                            onJumpToError={(fieldName) => {
                                const el = document.querySelector(`[name="${fieldName}"]`) as HTMLInputElement;
                                el?.focus();
                                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                        />
                    </div>
                )}

                {/* Form Content */}
                <div className="p-4 sm:p-6 space-y-5">
                    {/* Company Name */}
                    <div>
                        <TextInput
                            label="اسم الشركة"
                            name="companyName"
                            value={formData.companyName || ''}
                            onChange={handleChange}
                            onBlur={() => validation.touchField('companyName')}
                            placeholder="أدخل اسم الشركة"
                            icon={<BuildingOfficeIcon className="w-5 h-5" />}
                            error={validation.errors.companyName}
                            required
                        />
                    </div>

                    {/* Email & Tax Number */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <TextInput
                            label="البريد الإلكتروني"
                            name="email"
                            type="email"
                            value={formData.email || ''}
                            onChange={handleChange}
                            onBlur={() => validation.touchField('email')}
                            placeholder="company@example.com"
                            icon={<EnvelopeIcon className="w-5 h-5" />}
                            error={validation.errors.email}
                        />
                        <TextInput
                            label="الرقم الضريبي"
                            name="taxNumber"
                            value={formData.taxNumber || ''}
                            onChange={handleChange}
                            onBlur={() => validation.touchField('taxNumber')}
                            placeholder="الرقم الضريبي"
                            icon={<IdentificationIcon className="w-5 h-5" />}
                            error={validation.errors.taxNumber}
                        />
                    </div>

                    {/* Location */}
                    <TextInput
                        label="الموقع"
                        name="location"
                        value={formData.location || ''}
                        onChange={handleChange}
                        placeholder="عنوان الشركة أو الموقع"
                        icon={<MapPinIcon className="w-5 h-5" />}
                    />
                </div>

                {/* Unsaved changes warning (subtle hint while editing; SafeModal
                    shows the full discard confirmation on close attempt). */}
                {isDirty && (
                    <div className="px-4 sm:px-6 pb-4">
                        <p className="text-xs text-amber-600 flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            لديك تغييرات غير محفوظة
                        </p>
                    </div>
                )}
            </div>
        </SafeModal>
    );
};

export default CompanyEditModal;
