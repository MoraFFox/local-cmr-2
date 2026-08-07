import React, { useState, useEffect } from "react";
import {
  CalendarIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  DateRange,
  ARABIC_PRESET_LABELS,
  ENGLISH_PRESET_LABELS,
  getDateRangePresets,
} from "../utils/dateRangeFilter";
import { useLanguage } from "../utils/LanguageContext";
import { useT } from "../utils/i18n";

interface DateRangeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (range: DateRange) => void;
  title?: string;
  isGenerating?: boolean;
}

const PRESET_KEYS = ["allTime", "today", "thisWeek", "thisMonth", "thisQuarter", "thisYear"] as const;

const DateRangeExportModal: React.FC<DateRangeExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
  title,
  isGenerating = false,
}) => {
  const { language } = useLanguage();
  const t = useT();
  const resolvedTitle = title ?? t.ui.dateRange.defaultTitle;
  const presetLabels = language === 'ar' ? ARABIC_PRESET_LABELS : ENGLISH_PRESET_LABELS;
  const [selectedPreset, setSelectedPreset] = useState<string>("allTime");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Reset to defaults when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPreset("allTime");
      setCustomStartDate("");
      setCustomEndDate("");
    }
  }, [isOpen]);

  const handlePresetClick = (key: string) => {
    setSelectedPreset(key);
    setCustomStartDate("");
    setCustomEndDate("");
  };

  const handleCustomDateChange = (field: "start" | "end", value: string) => {
    if (field === "start") {
      setCustomStartDate(value);
    } else {
      setCustomEndDate(value);
    }
    setSelectedPreset("custom");
  };

  const buildActiveRange = (): DateRange => {
    const presets = getDateRangePresets();
    if (selectedPreset !== "custom" && selectedPreset in presets) {
      return presets[selectedPreset];
    }
    return {
      startDate: customStartDate || undefined,
      endDate: customEndDate || undefined,
      preset: "custom",
    };
  };

  const handleExport = () => {
    onExport(buildActiveRange());
  };

  if (!isOpen) return null;

  const activeRange = buildActiveRange();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-cream dark:bg-espresso rounded-xl shadow-2xl border border-hairline dark:border-hairline w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-hairline dark:border-hairline">
          <h2 className="text-lg font-bold text-primary dark:text-white">
            {resolvedTitle}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-latte hover:text-primary hover:bg-cream-2 dark:hover:bg-espresso-light transition-colors"
            aria-label={t.ui.dateRange.close}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Preset buttons */}
          <div>
            <h3 className="text-sm font-semibold text-primary dark:text-latte/70 mb-3">
              {t.ui.dateRange.timePeriod}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePresetClick(key)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all duration-200 text-sm ${
                    selectedPreset === key
                      ? "border-primary bg-primary/10 text-primary dark:text-primary-300 font-bold"
                      : "border-hairline dark:border-hairline text-latte hover:border-primary/30 hover:text-primary dark:hover:text-latte/70"
                  }`}
                >
                  <CalendarIcon className="w-5 h-5" />
                  <span>{presetLabels[key]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom date range */}
          <div>
            <h3
              className={`text-sm font-semibold mb-3 ${
                selectedPreset === "custom"
                  ? "text-primary dark:text-white"
                  : "text-latte"
              }`}
            >
              {presetLabels.custom}
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label htmlFor="date-range-start" className="block text-xs text-latte mb-1">{t.ui.dateRange.from}</label>
                <input
                  id="date-range-start"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => handleCustomDateChange("start", e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-espresso-light text-primary dark:text-white rounded-lg border border-hairline dark:border-hairline text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
                />
              </div>
              <span className="text-latte mt-5">—</span>
              <div className="flex-1">
                <label htmlFor="date-range-end" className="block text-xs text-latte mb-1">{t.ui.dateRange.to}</label>
                <input
                  id="date-range-end"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => handleCustomDateChange("end", e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-espresso-light text-primary dark:text-white rounded-lg border border-hairline dark:border-hairline text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Selected range indicator */}
          {activeRange.preset !== "allTime" && (
            <div className="p-3 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-lg text-sm text-primary dark:text-primary-300 text-center font-medium">
              {(activeRange.startDate || activeRange.endDate)
                ? `${activeRange.startDate || "..."} — ${activeRange.endDate || "..."}`
                : presetLabels[activeRange.preset || "custom"]}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-hairline dark:border-hairline bg-cream-2/50 dark:bg-espresso-light/30">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2 text-sm font-medium text-latte hover:text-primary rounded-lg transition-colors disabled:opacity-50"
          >
            {t.ui.dateRange.cancel}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isGenerating}
            className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-primary hover:bg-hover rounded-lg shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t.ui.dateRange.exporting}
              </>
            ) : (
              <>
                <CalendarIcon className="w-4 h-4" />
                {t.ui.dateRange.export}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DateRangeExportModal;
