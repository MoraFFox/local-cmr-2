import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { LogisticsOperation, CompanyMachine } from '../types';
import { logger } from '../utils/logger';

/**
 * Calculate rental duration between two maintenance record visit dates.
 * Uses maintenance record dates only — NEVER browser/server time.
 */
export function calculateRentalDuration(
  openDate: string,
  closeDate: string
): { days: number; hours: number; minutes: number } {
  const start = new Date(openDate);
  const end = new Date(closeDate);
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return { days: 0, hours: 0, minutes: 0 };
  const totalMinutes = Math.floor(diffMs / 60000);
  return {
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
  };
}

/** Daily rental price = monthly / 30 (fixed business rule). */
export function calculateDailyRentalPrice(monthlyPrice: number): number {
  return Math.round((monthlyPrice / 30) * 100) / 100;
}

/** Billable days = calendar days (simple policy). */
export function calculateBillableDays(duration: { days: number }): number {
  return Math.max(0, duration.days);
}

export interface CreateLogisticsOperationInput {
  operation_type: 'pickup_and_deliver' | 'deliver_only' | 'pickup_only';
  machine_category?: string;
  machine_ownership?: string;
  machine_type?: string;
  replacement_machine_id?: number | null;
  monthly_rental_price?: number;
  pickup_cost?: number;
  return_cost?: number;
  internal_notes?: string;
}

export interface CloseOperationData {
  closed_by_record_id: number;
  close_date: string; // maintenanceDate of the closing record
}

/**
 * Hook for fetching and managing logistics operations for a customer.
 */
export function useLogisticsOperations(customerId: number | null) {
  const [operations, setOperations] = useState<LogisticsOperation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOperations = useCallback(async () => {
    if (!customerId) {
      setOperations([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: supaError } = await supabase
        .from('logistics_operations')
        .select('*, company_machines(*)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (supaError) throw new Error(supaError.message);
      setOperations((data as LogisticsOperation[]) ?? []);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to fetch logistics operations', e, 'logistics');
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchOperations();
  }, [fetchOperations]);

  const createOperation = useCallback(
    async (input: CreateLogisticsOperationInput, openedByRecordId: number): Promise<LogisticsOperation | null> => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        const { data, error: supaError } = await supabase
          .from('logistics_operations')
          .insert({
            customer_id: customerId,
            opened_by_record_id: openedByRecordId,
            operation_type: input.operation_type,
            status: 'open',
            machine_category: input.machine_category ?? null,
            machine_ownership: input.machine_ownership ?? null,
            machine_type: input.machine_type ?? null,
            replacement_machine_id: input.replacement_machine_id ?? null,
            monthly_rental_price: input.monthly_rental_price != null ? Math.max(0, input.monthly_rental_price) : null,
            pickup_cost: input.pickup_cost != null ? Math.max(0, input.pickup_cost) : 0,
            return_cost: input.return_cost != null ? Math.max(0, input.return_cost) : 0,
            internal_notes: input.internal_notes ?? null,
            created_by: userId,
          })
          .select('*, company_machines(*)')
          .single();

        if (supaError) throw new Error(supaError.message);
        const newOp = data as LogisticsOperation;
        setOperations((prev) => [newOp, ...prev]);
        return newOp;
      } catch (err) {
        const e = err instanceof Error ? err : new Error('فشل إنشاء عملية لوجستية');
        logger.error('Failed to create logistics operation', e, 'logistics');
        throw e;
      }
    },
    [customerId],
  );

  const closeOperation = useCallback(
    async (operationId: number, closeData: CloseOperationData): Promise<LogisticsOperation | null> => {
      try {
        const operation = operations.find((o) => o.id === operationId);
        if (!operation) throw new Error('العملية غير موجودة');

        // Get the open date from the opening record's visit date
        // We need to fetch the opening record to get its maintenanceDate
        const { data: openRecord, error: openErr } = await supabase
          .from('maintenance_history')
          .select('maintenanceDate')
          .eq('id', operation.opened_by_record_id)
          .single();

        if (openErr) throw new Error(`فشل جلب تاريخ الفتح: ${openErr.message}`);

        const openDate = (openRecord as any)?.maintenanceDate;
        if (!openDate) throw new Error('تاريخ الفتح غير موجود في سجل الصيانة');

        const duration = calculateRentalDuration(openDate, closeData.close_date);
        const billableDays = calculateBillableDays(duration);
        const dailyPrice = operation.monthly_rental_price
          ? calculateDailyRentalPrice(operation.monthly_rental_price)
          : 0;
        const rentalCost = Math.round(billableDays * dailyPrice * 100) / 100;

        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;

        const { data, error: supaError } = await supabase
          .from('logistics_operations')
          .update({
            status: 'closed',
            closed_by_record_id: closeData.closed_by_record_id,
            rental_duration_days: duration.days,
            rental_duration_hours: duration.hours,
            rental_duration_minutes: duration.minutes,
            billable_days: billableDays,
            total_rental_cost: rentalCost,
            closed_by: userId,
          })
          .eq('id', operationId)
          .select('*, company_machines(*)')
          .single();

        if (supaError) throw new Error(supaError.message);
        const updated = data as LogisticsOperation;
        setOperations((prev) => prev.map((o) => (o.id === operationId ? updated : o)));
        return updated;
      } catch (err) {
        const e = err instanceof Error ? err : new Error('فشل إغلاق العملية اللوجستية');
        logger.error('Failed to close logistics operation', e, 'logistics');
        throw e;
      }
    },
    [operations],
  );

  return {
    operations,
    isLoading,
    error,
    createOperation,
    closeOperation,
    refresh: fetchOperations,
  };
}

/**
 * Hook for managing company-owned replacement machines.
 */
export function useCompanyMachines() {
  const [machines, setMachines] = useState<CompanyMachine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMachines = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: supaError } = await supabase
        .from('company_machines')
        .select('*')
        .order('created_at', { ascending: false });

      if (supaError) throw new Error(supaError.message);
      setMachines((data as CompanyMachine[]) ?? []);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to fetch company machines', e, 'logistics');
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMachines();
  }, [fetchMachines]);

  const addMachine = useCallback(
    async (machine: Omit<CompanyMachine, 'id' | 'created_at' | 'updated_at'>): Promise<CompanyMachine | null> => {
      try {
        const { data, error: supaError } = await supabase
          .from('company_machines')
          .insert({
            name: machine.name,
            category: machine.category,
            machine_type: machine.machine_type ?? null,
            status: machine.status ?? 'available',
            monthly_rental_price: machine.monthly_rental_price ?? null,
            notes: machine.notes ?? null,
          })
          .select()
          .single();

        if (supaError) throw new Error(supaError.message);
        const newMachine = data as CompanyMachine;
        setMachines((prev) => [newMachine, ...prev]);
        return newMachine;
      } catch (err) {
        const e = err instanceof Error ? err : new Error('فشل إضافة الماكينة');
        logger.error('Failed to add company machine', e, 'logistics');
        throw e;
      }
    },
    [],
  );

  const updateMachine = useCallback(
    async (id: number, updates: Partial<CompanyMachine>): Promise<CompanyMachine | null> => {
      try {
        const { data, error: supaError } = await supabase
          .from('company_machines')
          .update({
            name: updates.name,
            category: updates.category,
            machine_type: updates.machine_type ?? null,
            status: updates.status,
            monthly_rental_price: updates.monthly_rental_price ?? null,
            notes: updates.notes ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (supaError) throw new Error(supaError.message);
        const updated = data as CompanyMachine;
        setMachines((prev) => prev.map((m) => (m.id === id ? updated : m)));
        return updated;
      } catch (err) {
        const e = err instanceof Error ? err : new Error('فشل تحديث الماكينة');
        logger.error('Failed to update company machine', e, 'logistics');
        throw e;
      }
    },
    [],
  );

  const deleteMachine = useCallback(async (id: number): Promise<void> => {
    try {
      const { error: supaError } = await supabase
        .from('company_machines')
        .delete()
        .eq('id', id);

      if (supaError) throw new Error(supaError.message);
      setMachines((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      const e = err instanceof Error ? err : new Error('فشل حذف الماكينة');
      logger.error('Failed to delete company machine', e, 'logistics');
      throw e;
    }
  }, []);

  return {
    machines,
    isLoading,
    error,
    addMachine,
    updateMachine,
    deleteMachine,
    refresh: fetchMachines,
  };
}
