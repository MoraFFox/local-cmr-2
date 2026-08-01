import React, { useMemo } from 'react';
import { useLogisticsOperations, calculateDailyRentalPrice } from '../../hooks/useLogisticsOperations';
import { LOGISTICS_TYPE_LABELS_AR } from '../../utils/logisticsLabels';
import ReportIcon from '../../components/ReportIcon';
import type { PdfIconName } from '../../utils/pdfTheme';
import EmptyState from '../../components/EmptyState';

interface LogisticsTimelineViewProps {
  customerId: number | null;
  customerName?: string;
}

const STATUS_BADGES: Record<string, { label: string; className: string; icon: PdfIconName }> = {
  open: { label: 'مفتوحة', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: 'alert' },
  closed: { label: 'مغلقة', className: 'bg-leaf-100 text-leaf-700 dark:bg-leaf-500/10 dark:text-leaf-300', icon: 'check' },
};

const LogisticsTimelineView: React.FC<LogisticsTimelineViewProps> = ({ customerId, customerName }) => {
  const { operations, isLoading } = useLogisticsOperations(customerId);

  const sorted = useMemo(() => {
    return [...operations].sort((a, b) => {
      // Open first, then closed by created_at desc
      if (a.status === 'open' && b.status !== 'open') return -1;
      if (a.status !== 'open' && b.status === 'open') return 1;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [operations]);

  const openCount = operations.filter(o => o.status === 'open').length;
  const closedCount = operations.filter(o => o.status === 'closed').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary dark:text-white">سجل العمليات اللوجستية</h1>
        {customerName && <p className="text-sm text-latte mt-1">{customerName}</p>}
        <div className="flex items-center gap-4 mt-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 rounded-full text-sm font-medium text-amber-700 dark:text-amber-400">
            <ReportIcon name="alert" className="w-4 h-4" />
            {openCount} مفتوحة
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-leaf-50 dark:bg-leaf-500/10 rounded-full text-sm font-medium text-leaf-700 dark:text-leaf-300">
            <ReportIcon name="check" className="w-4 h-4" />
            {closedCount} مغلقة
          </span>
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          variant="page"
          icon={<ReportIcon name="truck" className="w-6 h-6" />}
          title="لا توجد عمليات لوجستية"
          message="ستظهر هنا جميع العمليات اللوجستية المرتبطة بهذا العميل بمجرد إضافتها من سجلات الصيانة"
        />
      ) : (
        <div className="space-y-4">
          {sorted.map((op) => {
            const status = STATUS_BADGES[op.status] || STATUS_BADGES.closed;
            return (
              <div
                key={op.id}
                className={`bg-cream dark:bg-espresso rounded-xl border p-5 transition-colors ${
                  op.status === 'open'
                    ? 'border-amber-500/30 dark:border-amber-500/20'
                    : 'border-hairline dark:border-hairline'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <ReportIcon name="truck" className={`w-6 h-6 ${op.status === 'open' ? 'text-amber-500' : 'text-latte'}`} />
                    <div>
                      <h3 className="font-semibold text-primary dark:text-white">
                        {LOGISTICS_TYPE_LABELS_AR[op.operation_type] || op.operation_type}
                      </h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                        <ReportIcon name={status.icon} className="w-3 h-3" />
                        {status.label}
                      </span>
                    </div>
                  </div>
                  {op.company_machines && (
                    <span className="text-sm text-latte">{op.company_machines.name}</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  {op.machine_category && (
                    <div className="flex items-center gap-2 text-latte">
                      <ReportIcon name="truck" className="w-4 h-4" />
                      <span>ماكينة العميل: {[op.machine_name, op.machine_category, op.machine_type].filter(Boolean).join(' · ')}</span>
                    </div>
                  )}
                  {(op.given_machine_category || op.given_machine_type || op.given_machine_name) && (
                    <div className="flex items-center gap-2 text-latte">
                      <ReportIcon name="truck" className="w-4 h-4" />
                      <span>الماكينة المقدمة: {[op.given_machine_name, op.given_machine_category, op.given_machine_type].filter(Boolean).join(' · ')}</span>
                    </div>
                  )}
                  {op.monthly_rental_price != null && (
                    <div className="flex items-center gap-2 text-latte">
                      <ReportIcon name="money" className="w-4 h-4" />
                      <span>
                        شهري: {op.monthly_rental_price.toLocaleString()} ج.م · يومي: {calculateDailyRentalPrice(op.monthly_rental_price).toLocaleString()} ج.م
                      </span>
                    </div>
                  )}
                  {op.total_rental_cost != null && (
                    <div className="flex items-center gap-2 text-primary dark:text-latte/70 font-medium">
                      <ReportIcon name="money" className="w-4 h-4 text-leaf-500" />
                      <span>إجمالي الإيجار: {op.total_rental_cost.toLocaleString()} ج.م</span>
                    </div>
                  )}
                </div>

                {op.status === 'closed' && op.rental_duration_days != null && (
                  <div className="mt-3 pt-3 border-t border-hairline dark:border-hairline grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-latte">
                    <div>المدة: {op.rental_duration_days} يوم</div>
                    {op.billable_days != null && <div>أيام قابلة للفوترة: {op.billable_days}</div>}
                    {op.pickup_cost != null && op.pickup_cost > 0 && <div>تكلفة الاستلام: {op.pickup_cost.toLocaleString()} ج.م</div>}
                    {op.return_cost != null && op.return_cost > 0 && <div>تكلفة الإرجاع: {op.return_cost.toLocaleString()} ج.م</div>}
                    {op.maintenance_cost != null && op.maintenance_cost > 0 && (
                      <div className="text-leaf-700 dark:text-leaf-300 font-medium">تكلفة الصيانة: {op.maintenance_cost.toLocaleString()} ج.م</div>
                    )}
                  </div>
                )}

                {op.status === 'closed' && (op.work_done || op.maintenance_issues?.length) && (
                  <div className="mt-2 space-y-0.5 text-xs text-latte/80">
                    {op.maintenance_issues && op.maintenance_issues.length > 0 && (
                      <p>المشاكل: {op.maintenance_issues.join('، ')}</p>
                    )}
                    {op.maintenance_services && op.maintenance_services.length > 0 && (
                      <p>الخدمات: {op.maintenance_services.map((s) => s.count > 1 ? `${s.name} ×${s.count}` : s.name).join('، ')}</p>
                    )}
                    {op.maintenance_parts && op.maintenance_parts.length > 0 && (
                      <p>القطع: {op.maintenance_parts.map((p) => p.count > 1 ? `${p.name} ×${p.count}` : p.name).join('، ')}</p>
                    )}
                    {!op.maintenance_issues?.length && !op.maintenance_services?.length && !op.maintenance_parts?.length && op.work_done && (
                      <p>الأعمال المنفذة: {op.work_done}</p>
                    )}
                  </div>
                )}

                {op.internal_notes && (
                  <p className="mt-2 text-xs text-latte/70 italic">{op.internal_notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LogisticsTimelineView;
