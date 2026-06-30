import React, { useState } from 'react';
import { MaintenanceTemplate, maintenanceTemplates, applyTemplate } from '../utils/maintenanceTemplates';
import { MaintenanceRecord } from '../types';
import { 
    SparklesIcon, 
    WrenchIcon, 
    BeakerIcon, 
    PresentationChartLineIcon,
    CpuChipIcon,
    FireIcon,
    AdjustmentsHorizontalIcon,
    XMarkIcon,
    CheckIcon
} from '@heroicons/react/24/outline';

interface TemplateSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectTemplate: (templateValues: Partial<MaintenanceRecord>) => void;
    suggestedTemplates?: MaintenanceTemplate[];
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    sparkles: SparklesIcon,
    wrench: WrenchIcon,
    beaker: BeakerIcon,
    activity: PresentationChartLineIcon,
    cpu: CpuChipIcon,
    flame: FireIcon,
    droplet: BeakerIcon,
    gauge: AdjustmentsHorizontalIcon
};

const TemplateSelector: React.FC<TemplateSelectorProps> = ({ 
    isOpen, 
    onClose, 
    onSelectTemplate,
    suggestedTemplates = []
}) => {
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'all' | 'suggested'>(suggestedTemplates.length > 0 ? 'suggested' : 'all');

    const handleSelectTemplate = (templateId: string) => {
        setSelectedTemplateId(templateId);
    };

    const handleApplyTemplate = () => {
        if (selectedTemplateId) {
            const templateValues = applyTemplate(selectedTemplateId);
            onSelectTemplate(templateValues);
            onClose();
        }
    };

    const handleClose = () => {
        setSelectedTemplateId(null);
        onClose();
    };

    const displayTemplates = activeTab === 'suggested' && suggestedTemplates.length > 0
        ? suggestedTemplates
        : maintenanceTemplates;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            Maintenance Templates
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Choose a template to quickly fill in common maintenance scenarios
                        </p>
                    </div>
                    
                    <button
                        onClick={handleClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                {suggestedTemplates.length > 0 && (
                    <div className="flex border-b border-slate-200 dark:border-slate-700">
                        <button
                            onClick={() => setActiveTab('suggested')}
                            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                                activeTab === 'suggested'
                                    ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50 dark:bg-teal-900/20'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            Suggested ({suggestedTemplates.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                                activeTab === 'all'
                                    ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50 dark:bg-teal-900/20'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            All Templates
                        </button>
                    </div>
                )}

                {/* Template Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {displayTemplates.map((template) => {
                            const IconComponent = iconMap[template.icon] || WrenchIcon;
                            const isSelected = selectedTemplateId === template.id;
                            
                            return (
                                <button
                                    key={template.id}
                                    onClick={() => handleSelectTemplate(template.id)}
                                    className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                                        isSelected
                                            ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                                            : 'border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                    }`}
                                >
                                    {isSelected && (
                                        <div className="absolute top-3 right-3">
                                            <div className="bg-teal-500 text-white rounded-full p-1">
                                                <CheckIcon className="w-3 h-3" />
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-lg ${
                                            isSelected
                                                ? 'bg-teal-100 dark:bg-teal-800 text-teal-600 dark:text-teal-400'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                        }`}>
                                            <IconComponent className="w-5 h-5" />
                                        </div>
                                        
                                        <div className="flex-1">
                                            <h3 className={`font-semibold ${
                                                isSelected
                                                    ? 'text-teal-900 dark:text-teal-100'
                                                    : 'text-slate-900 dark:text-slate-100'
                                            }`}>
                                                {template.name}
                                            </h3>
                                            
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                {template.description}
                                            </p>
                                            
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {template.defaultValues.hadProblem && (
                                                    <span className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
                                                        Has Problem
                                                    </span>
                                                )}
                                                
                                                {template.defaultValues.partsWereReplaced && (
                                                    <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full">
                                                        Parts Changed
                                                    </span>
                                                )}
                                                
                                                {template.defaultValues.problemSolved && (
                                                    <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                                                        Solved
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        Cancel
                    </button>
                    
                    <button
                        onClick={handleApplyTemplate}
                        disabled={!selectedTemplateId}
                        className="px-6 py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        Apply Template
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TemplateSelector;
