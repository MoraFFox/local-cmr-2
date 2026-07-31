/**
 * Machine type field for the company wizard.
 *
 * A select with the fixed options (ماكينة / جرايندر) plus every machine type
 * already saved in the database (derived from existing submissions), and an
 * "أخرى" option that reveals a free-text input for a brand-new type.
 *
 * Custom types typed here are stored on the record (machineType), so they are
 * persisted to the DB and automatically appear as select options in future
 * records — no separate dictionary table is needed.
 */
import React, { useState, useEffect, useId } from "react";
import { HelpTooltip } from "../../../components/form-ui/HelpTooltip";

interface MachineTypeFieldProps {
  value?: string;
  /** Called with the new machineType whenever the select or the custom input changes. */
  onChange: (value: string) => void;
  /** All machine types previously saved across submissions (DB-derived). */
  knownTypes?: string[];
  name?: string;
  dataField?: string;
  helpText?: string;
}

const FIXED_MACHINE_TYPES = ["ماكينة", "جرايندر"];
const OTHER_TYPE = "other";

const MachineTypeField: React.FC<MachineTypeFieldProps> = ({
  value = "",
  onChange,
  knownTypes = [],
  name = "machineType",
  dataField,
  helpText,
}) => {
  const options = React.useMemo(() => {
    const seen = new Set(FIXED_MACHINE_TYPES);
    const saved = knownTypes.filter(
      (t) => t && !seen.has(t) && t !== OTHER_TYPE,
    );
    return [...FIXED_MACHINE_TYPES, ...saved];
  }, [knownTypes]);

  // A stored value that isn't one of the select options came from the "أخرى"
  // free-text input (e.g. a type typed in an earlier record).
  const isCustomValue = !!value && !options.includes(value);
  const [isOther, setIsOther] = useState(isCustomValue);

  // Keep the "أخرى" mode in sync with external value changes (edit mode /
  // draft load). Empty value means the user picked "أخرى" but hasn't typed yet,
  // so we leave the mode as-is in that case.
  useEffect(() => {
    if (value && !options.includes(value)) setIsOther(true);
    else if (value) setIsOther(false);
  }, [value, options]);

  const selectValue = isOther ? OTHER_TYPE : value;
  // Unique per machine row so multiple machines never share a label-for id.
  const inputId = useId();

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <label htmlFor={inputId} className="text-xs sm:text-sm font-medium text-primary">
          نوع الماكينة (اختياري)
        </label>
        {helpText && <HelpTooltip text={helpText} variant="inline" size="sm" />}
      </div>
      <select
        id={inputId}
        name={name}
        data-field={dataField}
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v === OTHER_TYPE) {
            setIsOther(true);
            onChange("");
          } else {
            setIsOther(false);
            onChange(v);
          }
        }}
        className="w-full ps-3 pe-10 py-3 bg-cream dark:bg-espresso-light text-base text-primary dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary border border-hairline dark:border-hairline"
      >
        <option value="">اختر النوع...</option>
        {options.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
        <option value={OTHER_TYPE}>أخرى (اكتب نوع جديد)</option>
      </select>
      {isOther && (
        <input
          type="text"
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="اكتب نوع الماكينة الجديد..."
          className="mt-2 w-full ps-3 pe-4 py-3 bg-cream dark:bg-espresso-light text-base text-primary dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary border border-hairline dark:border-hairline"
        />
      )}
    </div>
  );
};

export default MachineTypeField;
