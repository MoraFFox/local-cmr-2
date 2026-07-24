import React, { useMemo } from "react";
import { ExclamationCircleIcon, ChevronLeftIcon } from "@heroicons/react/24/outline";
import { getMissingFields } from "../utils/missingDataPdf";
import type { MissingField, MissingFieldsResult } from "../utils/missingDataPdf";
import { useWizardJump } from "@/src/views/wizard/WizardJumpContext";
import type { FormData } from "../types";

interface MissingFieldsPanelProps {
  formData: FormData;
  scope?: "company" | "branch";
  branchId?: number;
  mode?: "dynamic" | "full";
  title?: string;
  className?: string;
}

export const MissingFieldsPanel: React.FC<MissingFieldsPanelProps> = ({
  formData,
  scope = "company",
  branchId,
  mode = "dynamic",
  title = "بيانات ناقصة",
  className,
}) => {
  const { jumpToField } = useWizardJump();

  const result = useMemo<MissingFieldsResult>(() => {
    const raw = getMissingFields(formData, {
      scope: (scope ?? "company") as "company" | "branch",
      branchId,
      mode: (mode ?? "dynamic") as "dynamic" | "full",
    });
    // Deduplicate each list independently so React never renders duplicate list keys
    // or stale handlers. Duplicates within a single list are usually a source bug;
    // keeping the first occurrence is the safest behavior for the UI.
    const dedupe = (fields: MissingField[]) => {
      const seen = new Set<string>();
      return fields.filter((field) => {
        if (seen.has(field.key)) {
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.warn(`MissingFieldsPanel: duplicate field key "${field.key}" dropped. Consider fixing the source in missingDataPdf.ts.`);
          }
          return false;
        }
        seen.add(field.key);
        return true;
      });
    };
    const branches: Record<number, MissingField[]> = {};
    Object.keys(raw.branches).forEach((idx) => {
      const numIdx = Number(idx);
      branches[numIdx] = dedupe(raw.branches[numIdx] || []);
    });
    return { ...raw, company: dedupe(raw.company), branches };
  }, [formData, scope, branchId, mode]);

  const branchEntries = useMemo(
    () =>
      Object.keys(result.branches)
        .map((idx) => ({ index: Number(idx), fields: result.branches[Number(idx)] }))
        .filter((entry): entry is { index: number; fields: MissingField[] } =>
          Array.isArray(entry.fields)
        ),
    [result.branches]
  );
  const hasMissing = result.company.length > 0 || branchEntries.length > 0;

  if (!hasMissing) return null;

  return (
    <div
      className={`bg-ember-50 dark:bg-ember-500/10 border border-ember-500/30 rounded-xl p-4 animate-fade-in ${className || ""}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 bg-ember-500/20 rounded-lg flex-shrink-0">
          <ExclamationCircleIcon className="w-5 h-5 text-ember-700 dark:text-ember-300" />
        </div>
        <h3 className="font-bold text-ember-700 dark:text-ember-300">{title}</h3>
      </div>

      <ul className="space-y-1.5">
        {result.company.map((field, index) => (
          <li key={`${field.key}-${index}`}>
            <button
              type="button"
              onClick={() => jumpToField(field.key)}
              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-ember-500/10 transition-colors text-right"
            >
              <ChevronLeftIcon className="w-4 h-4 text-ember-500 flex-shrink-0" />
              <span className="text-sm text-ember-800 dark:text-ember-200 flex-1">{field.label}</span>
            </button>
          </li>
        ))}
        {branchEntries.map(({ index: branchIndex, fields }) => (
          <li key={branchIndex}>
            <div className="text-xs font-semibold text-ember-700/70 dark:text-ember-300/70 uppercase tracking-wider mt-3 mb-1">
              فرع {branchIndex + 1}
            </div>
            <ul className="space-y-1">
              {fields.map((field, fieldIndex) => (
                <li key={`${field.key}-${fieldIndex}`}>
                  <button
                    type="button"
                    onClick={() => jumpToField(field.key)}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-ember-500/10 transition-colors text-right"
                  >
                    <ChevronLeftIcon className="w-4 h-4 text-ember-500 flex-shrink-0" />
                    <span className="text-sm text-ember-800 dark:text-ember-200 flex-1">{field.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MissingFieldsPanel;
