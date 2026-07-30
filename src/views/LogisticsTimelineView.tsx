import React, { useMemo } from 'react';
import { useLogisticsOperations, calculateDailyRentalPrice } from '../../hooks/useLogisticsOperations';
import { LOGISTICS_TYPE_LABELS_AR } from '../../utils/logisticsLabels';
import {
  TruckIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  CalendarIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import EmptyState from '../../components/EmptyState';

interface LogisticsTimelineViewProps {
  customerId: number | null;
  customerName?: string;
}

const STATUS_BADGES: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  open: { label: 'مفتوحة', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: ExclamationCircleIcon },
  closed: { label: 'مغلقة', className: 'bg-leaf-100 text-leaf-700 dark:bg-leaf-500/10 dark:text-leaf-300', icon: CheckCircleIcon },
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
            <ExclamationCircleIcon className="w-4 h-4" />
            {openCount} مفتوحة
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-leaf-50 dark:bg-leaf-500/10 rounded-full text-sm font-medium text-leaf-700 dark:text-leaf-300">
            <CheckCircleIcon className="w-4 h-4" />
            {closedCount} مغلقة
          </span>
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          variant="page"
          icon={<TruckIcon />}
          title="لا توجد عمليات لوجستية"
          message="ستظهر هنا جميع العمليات اللوجستية المرتبطة بهذا العميل بمجرد إضافتها من سجلات الصيانة"
        />
      ) : (
        <div className="space-y-4">
          {sorted.map((op) => {
            const status = STATUS_BADGES[op.status] || STATUS_BADGES.closed;
            const StatusIcon = status.icon;
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
                    <TruckIcon className={`w-6 h-6 ${op.status === 'open' ? 'text-amber-500' : 'text-latte'}`} />
                    <div>
                      <h3 className="font-semibold text-primary dark:text-white">
                        {LOGISTICS_TYPE_LABELS_AR[op.operation_type] || op.operation_type}
                      </h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                        <StatusIcon className="w-3 h-3" />
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
                      <CalendarIcon className="w-4 h-4" />
                      <span>الفئة: {op.machine_category}</span>
                    </div>
                  )}
                  {op.monthly_rental_price != null && (
                    <div className="flex items-center gap-2 text-latte">
                      <CurrencyDollarIcon className="w-4 h-4" />
                      <span>
                        شهري: {op.monthly_rental_price.toLocaleString()} ج.م · يومي: {calculateDailyRentalPrice(op.monthly_rental_price).toLocaleString()} ج.م
                      </span>
                    </div>
                  )}
                  {op.total_rental_cost != null && (
                    <div className="flex items-center gap-2 text-primary dark:text-latte/70 font-medium">
                      <CurrencyDollarIcon className="w-4 h-4 text-leaf-500" />
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
