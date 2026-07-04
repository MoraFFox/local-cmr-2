import React, { useState, useEffect } from 'react';
import { FormData } from '../types';
import { XMarkIcon, BuildingOfficeIcon, EnvelopeIcon, IdentificationIcon, MapPinIcon } from '@heroicons/react/24/outline';
import TextInput from './TextInput';

interface CompanyEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    company: FormData | null;
    onSave: (updatedCompany: FormData) => void;
}

interface ValidationErrors {
    companyName?: string;
    email?: string;
    taxNumber?: string;
    location?: string;
}

const CompanyEditModal: React.FC<CompanyEditModalProps> = ({ isOpen, onClose, company, onSave }) => {
    const [formData, setFormData] = useState<Partial<FormData>>({});
    const [errors, setErrors] = useState<ValidationErrors>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (company && isOpen) {
            setFormData({
                companyName: company.companyName,
                email: company.email,
                taxNumber: company.taxNumber,
                location: company.location,
            });
            setErrors({});
        }
    }, [company, isOpen]);

    const validateForm = (): boolean => {
        const newErrors: ValidationErrors = {};
        
        if (!formData.companyName?.trim()) {
            newErrors.companyName = 'Company name is required';
        }
        
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }
        
        if (formData.taxNumber && !/^\d+$/.test(formData.taxNumber)) {
            newErrors.taxNumber = 'Tax number must contain only digits';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Clear error when user starts typing
        if (errors[name as keyof ValidationErrors]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const handleSave = async () => {
        if (!validateForm() || !company) return;
        
        setIsSaving(true);
        
        // Simulate async operation for better UX
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const updatedCompany: FormData = {
            ...company,
            companyName: formData.companyName || company.companyName,
            email: formData.email || '',
            taxNumber: formData.taxNumber || '',
            location: formData.location || '',
        };
        
        onSave(updatedCompany);
        setIsSaving(false);
        onClose();
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen || !company) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in overflow-y-auto"
            onClick={handleBackdropClick}
        >
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg my-4 sm:my-0 overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                            <BuildingOfficeIcon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                Edit Company
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {company.companyName || 'Unnamed Company'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 sm:p-2 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        aria-label="إغلاق النافذة"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Content */}
                <div className="p-4 sm:p-6 space-y-5">
                    {/* Company Name */}
                    <div>
                        <TextInput
                            label="اسم الشركة"
                            name="companyName"
                            value={formData.companyName || ''}
                            onChange={handleChange}
                            placeholder="أدخل اسم الشركة"
                            icon={<BuildingOfficeIcon className="w-5 h-5" />}
                            error={errors.companyName}
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
                            placeholder="company@example.com"
                            icon={<EnvelopeIcon className="w-5 h-5" />}
                            error={errors.email}
                        />
                        <TextInput
                            label="الرقم الضريبي"
                            name="taxNumber"
                            value={formData.taxNumber || ''}
                            onChange={handleChange}
                            placeholder="الرقم الضريبي"
                            icon={<IdentificationIcon className="w-5 h-5" />}
                            error={errors.taxNumber}
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

                {/* Footer Actions */}
                <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 px-4 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-4 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full sm:w-auto px-6 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CompanyEditModal;
