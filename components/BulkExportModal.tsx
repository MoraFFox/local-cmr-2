import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  DocumentArrowDownIcon,
  DocumentTextIcon,
  TableCellsIcon,
  Squares2X2Icon,
  ListBulletIcon,
} from "@heroicons/react/24/outline";
import { BatchExportItem } from "../utils/internalReportPdf";
import { partsList, servicesList } from "../constants";
import { getRecordCostSummary, formatEnNumber } from "../utils/costAggregation";

export type BulkExportMode = "client" | "cost" | "internal";

interface BulkExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: BatchExportItem[];
  isGenerating?: boolean;
  onExportPDF: (mode: BulkExportMode, grouped: boolean, includeSummary: boolean) => void;
  onExportCSV: () => void;
  /** Optional — when provided, a "Export Word" (.docx) button is shown. */
  onExportWord?: (mode: BulkExportMode, grouped: boolean, includeSummary: boolean) => void;
  title?: string;
}

const MODE_OPTIONS: Array<{
  value: BulkExportMode;
  label: string;
  desc: string;
}> = [
  { value: "client", label: "Client", desc: "No costs shown" },
  { value: "cost", label: "Cost", desc: "All costs, no payer split" },
  { value: "internal", label: "Internal", desc: "Costs + payer split" },
];

const BulkExportModal: React.FC<BulkExportModalProps> = ({
  isOpen,
  onClose,
  items,
  isGenerating = false,
  onExportPDF,
  onExportCSV,
  onExportWord,
  title = "Bulk Export",
}) => {
  const [mode, setMode] = useState<BulkExportMode>("cost");
  const [grouped, setGrouped] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);

  // Reset to defaults when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode("cost");
      setGrouped(true);
      setIncludeSummary(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const companyCount = new Set(items.map((i) => i.companyName)).size;
  const branchCount = new Set(items.map((i) => `${i.companyId}-${i.branchId}`)).size;
  const totalCost = items.reduce(
    (sum, it) => sum + getRecordCostSummary(it.record, partsList, servicesList).total,
    0,
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
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
          <h2 className="text-lg font-bold text-primary dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-latte hover:text-primary hover:bg-cream-2 dark:hover:bg-espresso-light transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Selection summary */}
          <div data-testid="bulk-summary" className="p-3 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-lg text-sm text-primary dark:text-primary-300 text-center font-medium">
            Exporting {items.length} records · {companyCount} {companyCount === 1 ? "company" : "companies"} · {branchCount} {branchCount === 1 ? "branch" : "branches"}
          </div>
          {mode !== "client" && items.length > 0 && (
            <div className="text-center text-xs text-latte -mt-3">
              Combined total: <span className="font-bold text-primary dark:text-white">EGP {formatEnNumber(totalCost)}</span>
            </div>
          )}

          {/* Report mode */}
          <div>
            <h3 className="text-sm font-semibold text-primary dark:text-latte/70 mb-3">Report Mode</h3>
            <div className="space-y-2">
              {MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMode(opt.value)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all duration-200 text-sm ${
                    mode === opt.value
                      ? "border-primary bg-primary/10 text-primary dark:text-primary-300 font-bold"
                      : "border-hairline dark:border-hairline text-latte hover:border-primary/30 hover:text-primary dark:hover:text-latte/70"
                  }`}
                >
                  <span>{opt.label}</span>
                  <span className="text-xs font-normal text-latte">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Grouping */}
          <div>
            <h3 className="text-sm font-semibold text-primary dark:text-latte/70 mb-3">Grouping</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGrouped(true)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all duration-200 text-sm ${
                  grouped
                    ? "border-primary bg-primary/10 text-primary dark:text-primary-300 font-bold"
                    : "border-hairline dark:border-hairline text-latte hover:border-primary/30 hover:text-primary dark:hover:text-latte/70"
                }`}
              >
                <Squares2X2Icon className="w-5 h-5" />
                <span>By Company → Branch</span>
              </button>
              <button
                type="button"
                onClick={() => setGrouped(false)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all duration-200 text-sm ${
                  !grouped
                    ? "border-primary bg-primary/10 text-primary dark:text-primary-300 font-bold"
                    : "border-hairline dark:border-hairline text-latte hover:border-primary/30 hover:text-primary dark:hover:text-latte/70"
                }`}
              >
                <ListBulletIcon className="w-5 h-5" />
                <span>Flat List</span>
              </button>
            </div>
          </div>

          {/* Summary table toggle */}
          <div>
            <button
              type="button"
              onClick={() => setIncludeSummary((s) => !s)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200 text-sm ${
                includeSummary
                  ? "border-primary bg-primary/10 text-primary dark:text-primary-300 font-bold"
                  : "border-hairline dark:border-hairline text-latte hover:border-primary/30 hover:text-primary dark:hover:text-latte/70"
              }`}
            >
              <TableCellsIcon className="w-5 h-5 shrink-0" />
              <span className="text-start">Summary table on cover</span>
              <span
                className={`ms-auto w-9 h-5 rounded-full relative transition-colors ${
                  includeSummary ? "bg-primary" : "bg-latte/30"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                    includeSummary ? "start-[18px]" : "start-0.5"
                  }`}
                />
              </span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-hairline dark:border-hairline bg-cream-2/50 dark:bg-espresso-light/30">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2 text-sm font-medium text-latte hover:text-primary rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onExportCSV}
            disabled={isGenerating || items.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-primary dark:text-white bg-white dark:bg-espresso-light border border-hairline dark:border-hairline rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary/40"
          >
            <TableCellsIcon className="w-4 h-4" />
            CSV
          </button>
          {onExportWord && (
            <button
              type="button"
              onClick={() => onExportWord(mode, grouped, includeSummary)}
              disabled={isGenerating || items.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-primary dark:text-white bg-white dark:bg-espresso-light border border-hairline dark:border-hairline rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary/40"
            >
              <DocumentTextIcon className="w-4 h-4" />
              Export Word
            </button>
          )}
          <button
            type="button"
            onClick={() => onExportPDF(mode, grouped, includeSummary)}
            disabled={isGenerating || items.length === 0}
            className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-primary hover:bg-hover rounded-lg shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <DocumentArrowDownIcon className="w-4 h-4" />
                Export PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkExportModal;
