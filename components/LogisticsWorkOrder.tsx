import React from 'react';
import { PrinterIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import type { LogisticsOperation } from '../types';
import {
  LOGISTICS_TYPE_LABELS_AR,
  LOGISTICS_STATUS_LABELS,
  formatMachineDescriptionAr,
  getMaintenanceWorkSections,
  MAINTENANCE_SECTION_LABELS_AR,
} from '../utils/logisticsLabels';
import { calculateDailyRentalPrice } from '../hooks/useLogisticsOperations';

interface LogisticsWorkOrderProps {
  /** The single operation being printed. */
  operation: LogisticsOperation;
  /** Sequential operation number (matches the timeline/PDF numbering). */
  opNumber: number;
  /** Optional company name for the header (defaults to the brand). */
  companyName?: string;
  onBack: () => void;
}

const fmtCurrency = (value?: number | null): string =>
  value != null && !isNaN(Number(value)) ? `${Number(value).toLocaleString()} ج.م` : '—';

/** Label + dotted underline field (fill-in style, like PrintableWorkOrder). */
const LinedField: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="text-sm">
    <span className="text-primary font-semibold">{label}:</span>{' '}
    {value ? (
      <span className="text-latte">{value}</span>
    ) : (
      <span className="inline-block w-full border-b border-dotted border-hairline h-5 align-bottom" />
    )}
  </div>
);

/** Numbered badge matching the timeline cards. */
const OpNumberBadge: React.FC<{ number: number }> = ({ number }) => (
  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-primary/10 dark:bg-primary/20 text-primary dark:text-copper-300 text-[10px] font-bold shrink-0">
    #{number}
  </span>
);

/** Structured work-done sections (issues/services/parts) with bullets. */
const WorkSections: React.FC<{ operation: LogisticsOperation }> = ({ operation }) => {
  const sections = getMaintenanceWorkSections(
    operation.maintenance_issues,
    operation.maintenance_services,
    operation.maintenance_parts,
  );

  if (sections.length === 0) {
    return operation.work_done ? (
      <p className="text-sm text-latte whitespace-pre-wrap">الأعمال: {operation.work_done}</p>
    ) : (
      <p className="text-sm text-latte">لا توجد بيانات أعمال مسجلة.</p>
    );
  }

  return (
    <div className="space-y-3">
      {sections.map((s) => (
        <div key={s.key} className="break-inside-avoid">
          <p className="text-[13px] font-bold text-primary mb-1">{MAINTENANCE_SECTION_LABELS_AR[s.key]}:</p>
          <ul className="space-y-0.5">
            {s.items.map((item, i) => (
              <li key={i} className="flex items-start gap-1.5 text-sm text-latte">
                <span className="text-primary/60 mt-px">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

const LogisticsWorkOrder: React.FC<LogisticsWorkOrderProps> = ({
  operation: op,
  opNumber,
  companyName,
  onBack,
}) => {
  const typeLabel = LOGISTICS_TYPE_LABELS_AR[op.operation_type] || op.operation_type;
  const statusLabel = LOGISTICS_STATUS_LABELS[op.status]?.label || op.status;
  const clientMachine = formatMachineDescriptionAr(op.machine_category, op.machine_type) || '—';
  const givenMachine =
    op.given_machine_category || op.given_machine_type
      ? formatMachineDescriptionAr(op.given_machine_category, op.given_machine_type)
      : null;
  const dailyRental =
    op.monthly_rental_price != null ? calculateDailyRentalPrice(op.monthly_rental_price) : null;

  return (
    <div className="bg-cream-2 dark:bg-espresso p-4 sm:p-8 print:p-0 print:bg-white">
      {/* Floating actions — hidden when printing */}
      <div className="fixed bottom-4 start-4 z-30 flex flex-col gap-3 print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-hover text-white font-bold py-3 px-5 rounded-full hover:bg-copper-700 transition-colors shadow-lg transform active:scale-95"
        >
          <PrinterIcon className="w-6 h-6" />
          <span>طباعة</span>
        </button>
        <button
          onClick={onBack}
          className="flex items-center gap-2 bg-espresso-light text-white font-bold py-3 px-5 rounded-full hover:bg-espresso-light/50 transition-colors shadow-lg transform active:scale-95"
        >
          <ArrowUturnLeftIcon className="w-6 h-6" />
          <span>رجوع</span>
        </button>
      </div>

      <div className="max-w-4xl mx-auto force-daylight bg-white p-4 sm:p-8 shadow-sm rounded-lg font-sans text-primary print:shadow-none print:rounded-none">
        {/* Header */}
        <header className="flex justify-between items-center pb-3 border-b-2 border-hairline">
          <div>
            <h1 className="text-2xl font-bold text-primary">أمر عمل لوجستي</h1>
            <p className="text-xs text-latte">وثيقة داخلية — تستخدم في الموقع</p>
          </div>
          <div className="flex flex-col ltr:items-end rtl:items-start">
            <img src="/logo.svg" alt="Mido for distribution" className="h-12 w-auto object-contain mb-1" />
            <div className="text-sm font-bold text-primary">{companyName || "Mido's for Distribution"}</div>
          </div>
        </header>

        {/* Operation summary */}
        <section className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
          <div className="flex items-center gap-2">
            <OpNumberBadge number={opNumber} />
            <span className="font-semibold text-primary">{typeLabel}</span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                op.status === 'open'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-leaf-50 text-leaf-700'
              }`}
            >
              {statusLabel}
            </span>
          </div>
          <LinedField label="تاريخ الفتح" value={op.open_date || '—'} />
          <LinedField label="تاريخ الإغلاق" value={op.close_date || '—'} />
        </section>

        {/* Machines */}
        <section className="mt-4 p-2 border border-hairline rounded-md break-inside-avoid">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary bg-cream-2 -m-2 mb-2 p-2 rounded-t-md border-b-2 border-hairline">
            الماكينات
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 px-1">
            <LinedField label="ماكينة العميل" value={clientMachine} />
            <LinedField label="الماكينة المقدمة" value={givenMachine || '—'} />
            {op.company_machines && (
              <LinedField label="البديلة (المخزن)" value={op.company_machines.name} />
            )}
          </div>
        </section>

        {/* Costs */}
        <section className="mt-4 p-2 border border-hairline rounded-md break-inside-avoid">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary bg-cream-2 -m-2 mb-2 p-2 rounded-t-md border-b-2 border-hairline">
            التكاليف
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2 px-1">
            {op.monthly_rental_price != null && (
              <LinedField label="الإيجار الشهري" value={fmtCurrency(op.monthly_rental_price)} />
            )}
            {dailyRental != null && (
              <LinedField label="الإيجار اليومي" value={fmtCurrency(dailyRental)} />
            )}
            {op.total_rental_cost != null && (
              <LinedField label="إجمالي الإيجار" value={fmtCurrency(op.total_rental_cost)} />
            )}
            {op.pickup_cost != null && op.pickup_cost > 0 && (
              <LinedField label="تكلفة الاستلام" value={fmtCurrency(op.pickup_cost)} />
            )}
            {op.return_cost != null && op.return_cost > 0 && (
              <LinedField label="تكلفة الإرجاع" value={fmtCurrency(op.return_cost)} />
            )}
            {op.maintenance_cost != null && (
              <LinedField label="تكلفة الصيانة" value={fmtCurrency(op.maintenance_cost)} />
            )}
            {op.total_logistics_cost != null && (
              <LinedField label="إجمالي العملية" value={fmtCurrency(op.total_logistics_cost)} />
            )}
          </div>
        </section>

        {/* Work performed — structured sections */}
        <section className="mt-4 p-2 border border-hairline rounded-md break-inside-avoid">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary bg-cream-2 -m-2 mb-2 p-2 rounded-t-md border-b-2 border-hairline">
            الأعمال المنفذة
          </h3>
          <div className="px-1">
            <WorkSections operation={op} />
          </div>
        </section>

        {/* Internal notes */}
        {op.internal_notes && (
          <section className="mt-4 p-2 border border-hairline rounded-md break-inside-avoid">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary bg-cream-2 -m-2 mb-2 p-2 rounded-t-md border-b-2 border-hairline">
              ملاحظات داخلية
            </h3>
            <p className="text-sm text-latte px-1 whitespace-pre-wrap">{op.internal_notes}</p>
          </section>
        )}

        {/* Signatures */}
        <section className="mt-10 grid grid-cols-2 gap-8">
          <div>
            <p className="text-xs text-latte mb-2">توقيع الفني</p>
            <div className="border-b border-dotted border-hairline h-8" />
          </div>
          <div>
            <p className="text-xs text-latte mb-2">توقيع العميل</p>
            <div className="border-b border-dotted border-hairline h-8" />
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t-2 border-hairline text-center">
          <p className="text-xs text-latte">نهاية أمر العمل</p>
        </footer>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0.5in;
          }
          .break-inside-avoid {
            break-inside: avoid;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};

export default LogisticsWorkOrder;
