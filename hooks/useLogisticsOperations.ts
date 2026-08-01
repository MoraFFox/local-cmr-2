import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { LogisticsOperation, CompanyMachine, MachineNameEntry, ServiceRecord, PartRecord } from '../types';
import { logger } from '../utils/logger';
import { composeMaintenanceWork } from '../utils/logisticsLabels';

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
  machine_name?: string;
  machine_ownership?: string;
  machine_type?: string;
  /** Machine given to the client (replacement) — category and system. */
  given_machine_category?: string;
  given_machine_name?: string;
  given_machine_type?: string;
  replacement_machine_id?: number | null;
  monthly_rental_price?: number;
  pickup_cost?: number;
  return_cost?: number;
  internal_notes?: string;
  open_date: string;
}

export interface CloseOperationData {
  closed_by_record_id: number;
  close_date: string; // maintenanceDate of the closing record
  /** Cost of maintenance performed on the client's machine (internal, always company-paid). */
  maintenance_cost: number;
  /** Problems/issues found on the client's machine — required. */
  maintenance_issues: string[];
  /** Services performed on the client's machine — optional. */
  maintenance_services?: ServiceRecord[];
  /** Parts changed on the client's machine — optional. */
  maintenance_parts?: PartRecord[];
}

/** Fields editable after creation (both open and closed operations). */
export interface UpdateLogisticsOperationInput {
  operation_type: 'pickup_and_deliver' | 'deliver_only' | 'pickup_only';
  machine_category?: string;
  machine_name?: string;
  machine_ownership?: string;
  machine_type?: string;
  given_machine_category?: string;
  given_machine_name?: string;
  given_machine_type?: string;
  replacement_machine_id?: number | null;
  monthly_rental_price?: number;
  pickup_cost?: number;
  return_cost?: number;
  internal_notes?: string;
  /** Only meaningful for closed operations. */
  maintenance_cost?: number;
  maintenance_issues?: string[];
  maintenance_services?: ServiceRecord[];
  maintenance_parts?: PartRecord[];
  /** Composed summary (issues/services/parts) for backward-compat display. */
  work_done?: string;
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
            open_date: input.open_date,
            operation_type: input.operation_type,
            status: 'open',
            machine_category: input.machine_category ?? null,
            machine_name: input.machine_name ?? null,
            machine_ownership: input.machine_ownership ?? null,
            machine_type: input.machine_type ?? null,
            given_machine_category: input.given_machine_category ?? null,
            given_machine_name: input.given_machine_name ?? null,
            given_machine_type: input.given_machine_type ?? null,
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

        // Use the stored open_date from the operation itself — no cross-table query needed.
        // Maintenance records are stored as JSON in the companies table, not as separate rows.
        const openDate = operation.open_date;
        if (!openDate) throw new Error('تاريخ الفتح غير موجود في العملية');

        const duration = calculateRentalDuration(openDate, closeData.close_date);
        const billableDays = calculateBillableDays(duration);
        const dailyPrice = operation.monthly_rental_price
          ? calculateDailyRentalPrice(operation.monthly_rental_price)
          : 0;
        const rentalCost = Math.round(billableDays * dailyPrice * 100) / 100;

        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;

        const maintenanceServices = closeData.maintenance_services ?? [];
        const maintenanceParts = closeData.maintenance_parts ?? [];

        const { data, error: supaError } = await supabase
          .from('logistics_operations')
          .update({
            status: 'closed',
            closed_by_record_id: closeData.closed_by_record_id,
            close_date: closeData.close_date,
            rental_duration_days: duration.days,
            rental_duration_hours: duration.hours,
            rental_duration_minutes: duration.minutes,
            billable_days: billableDays,
            total_rental_cost: rentalCost,
            maintenance_cost: Math.max(0, closeData.maintenance_cost),
            maintenance_issues: closeData.maintenance_issues ?? [],
            maintenance_services: maintenanceServices,
            maintenance_parts: maintenanceParts,
            work_done: composeMaintenanceWork(closeData.maintenance_issues, maintenanceServices, maintenanceParts),
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

  const updateOperation = useCallback(
    async (operationId: number, input: UpdateLogisticsOperationInput): Promise<LogisticsOperation | null> => {
      try {
        const { data, error: supaError } = await supabase
          .from('logistics_operations')
          .update({
            operation_type: input.operation_type,
            machine_category: input.machine_category ?? null,
            machine_name: input.machine_name ?? null,
            machine_ownership: input.machine_ownership ?? null,
            machine_type: input.machine_type ?? null,
            given_machine_category: input.given_machine_category ?? null,
            given_machine_name: input.given_machine_name ?? null,
            given_machine_type: input.given_machine_type ?? null,
            replacement_machine_id: input.replacement_machine_id ?? null,
            monthly_rental_price: input.monthly_rental_price != null ? Math.max(0, input.monthly_rental_price) : null,
            pickup_cost: input.pickup_cost != null ? Math.max(0, input.pickup_cost) : 0,
            return_cost: input.return_cost != null ? Math.max(0, input.return_cost) : 0,
            internal_notes: input.internal_notes ?? null,
            // Only overwrite close-time data when explicitly provided, so an edit that
            // omits maintenance fields never wipes them from a closed operation.
            ...(input.maintenance_cost != null ? { maintenance_cost: Math.max(0, input.maintenance_cost) } : {}),
            ...(input.maintenance_issues != null ? { maintenance_issues: input.maintenance_issues } : {}),
            ...(input.maintenance_services != null ? { maintenance_services: input.maintenance_services } : {}),
            ...(input.maintenance_parts != null ? { maintenance_parts: input.maintenance_parts } : {}),
            // Re-compose the legacy work_done summary whenever the structured
            // close data changes, so the column never goes stale on edits.
            ...(input.maintenance_issues != null || input.maintenance_services != null || input.maintenance_parts != null
              ? { work_done: composeMaintenanceWork(
                  input.maintenance_issues ?? [],
                  input.maintenance_services ?? [],
                  input.maintenance_parts ?? [],
                ) }
              : {}),
            ...(input.work_done != null ? { work_done: input.work_done } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq('id', operationId)
          .select('*, company_machines(*)')
          .single();

        if (supaError) throw new Error(supaError.message);
        const updated = data as LogisticsOperation;
        setOperations((prev) => prev.map((o) => (o.id === operationId ? updated : o)));
        return updated;
      } catch (err) {
        const e = err instanceof Error ? err : new Error('فشل تحديث العملية اللوجستية');
        logger.error('Failed to update logistics operation', e, 'logistics');
        throw e;
      }
    },
    [],
  );

  const deleteOperation = useCallback(async (operationId: number): Promise<void> => {
    try {
      const { error: supaError } = await supabase
        .from('logistics_operations')
        .delete()
        .eq('id', operationId);

      if (supaError) throw new Error(supaError.message);
      setOperations((prev) => prev.filter((o) => o.id !== operationId));
    } catch (err) {
      const e = err instanceof Error ? err : new Error('فشل حذف العملية اللوجستية');
      logger.error('Failed to delete logistics operation', e, 'logistics');
      throw e;
    }
  }, []);

  return {
    operations,
    isLoading,
    error,
    createOperation,
    closeOperation,
    updateOperation,
    deleteOperation,
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

/**
 * Normalize a machine name for duplicate detection: trim edges, collapse
 * internal whitespace, and lowercase. Case/whitespace variants of the same
 * brand ("La Marzocco" vs "la  marzocco") map to one key.
 */
export function normalizeMachineName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Group machine names into case/whitespace-insensitive duplicate groups.
 * Returns only groups with 2+ members, each group ordered by the input order.
 */
export function findDuplicateNameGroups(names: MachineNameEntry[]): MachineNameEntry[][] {
  const byKey = new Map<string, MachineNameEntry[]>();
  names.forEach((n) => {
    const key = normalizeMachineName(n.name);
    if (!key) return;
    const list = byKey.get(key) ?? [];
    list.push(n);
    byKey.set(key, list);
  });
  return Array.from(byKey.values()).filter((g) => g.length > 1);
}

/**
 * Hook for managing saved machine names/brands. These are offered as
 * suggestions in the logistics form's Machine Name fields and managed from
 * the company machines settings page.
 */
export function useMachineNames() {
  const [names, setNames] = useState<MachineNameEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchNames = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: supaError } = await supabase
        .from('machine_names')
        .select('*')
        .order('name', { ascending: true });

      if (supaError) throw new Error(supaError.message);
      setNames((data as MachineNameEntry[]) ?? []);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to fetch machine names', e, 'logistics');
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNames();
  }, [fetchNames]);

  const addMachineName = useCallback(
    async (name: string): Promise<MachineNameEntry | null> => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      // Friendly duplicate guard — the DB UNIQUE constraint is the backstop,
      // but surfacing a clear Arabic message beats a raw Postgres 23505 error.
      if (names.some((n) => n.name.toLowerCase() === trimmed.toLowerCase())) {
        throw new Error('اسم الماكينة محفوظ بالفعل');
      }
      try {
        const { data, error: supaError } = await supabase
          .from('machine_names')
          .insert({ name: trimmed })
          .select()
          .single();

        if (supaError) {
          // Map the DB-level unique-violation (23505) to a friendly Arabic message
          // as a backstop for races/other sessions the local guard can't see.
          throw supaError.code === '23505'
            ? new Error('اسم الماكينة محفوظ بالفعل')
            : new Error(supaError.message);
        }
        const newName = data as MachineNameEntry;
        setNames((prev) =>
          [...prev, newName].sort((a, b) => a.name.localeCompare(b.name)),
        );
        return newName;
      } catch (err) {
        const e = err instanceof Error ? err : new Error('فشل إضافة اسم الماكينة');
        logger.error('Failed to add machine name', e, 'logistics');
        throw e;
      }
    },
    [names],
  );

  const deleteMachineName = useCallback(async (id: number): Promise<void> => {
    try {
      const { error: supaError } = await supabase
        .from('machine_names')
        .delete()
        .eq('id', id);

      if (supaError) throw new Error(supaError.message);
      setNames((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      const e = err instanceof Error ? err : new Error('فشل حذف اسم الماكينة');
      logger.error('Failed to delete machine name', e, 'logistics');
      throw e;
    }
  }, []);

  /**
   * Consolidate near-duplicate names into one: keep the entry with `keepId`
   * and delete the rest in a single query.
   */
  const mergeMachineNames = useCallback(
    async (keepId: number, duplicateIds: number[]): Promise<void> => {
      if (duplicateIds.length === 0) return;
      try {
        const { error: supaError } = await supabase
          .from('machine_names')
          .delete()
          .in('id', duplicateIds);

        if (supaError) throw new Error(supaError.message);
        const drop = new Set(duplicateIds);
        setNames((prev) => prev.filter((n) => n.id === keepId || !drop.has(n.id)));
      } catch (err) {
        const e = err instanceof Error ? err : new Error('فشل دمج أسماء الماكينات');
        logger.error('Failed to merge machine names', e, 'logistics');
        throw e;
      }
    },
    [],
  );

  return {
    names,
    isLoading,
    error,
    addMachineName,
    deleteMachineName,
    mergeMachineNames,
    refresh: fetchNames,
  };
}
