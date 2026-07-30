import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Part, Service, CustomProblem } from '../types';
import { logger } from '../utils/logger';
import { partsList, servicesList, problemCategories } from '../constants';

export type CatalogItemType = 'part' | 'service' | 'problem';

export interface CustomCatalogItem {
  id: string;
  type: CatalogItemType;
  label: string;
  value: string;
  category?: string | null;
  cost?: number | null;
  isFrequentlyReplaced?: boolean;
  description?: string | null;
}

interface UseCustomCatalogReturn {
  customParts: Part[];
  customServices: Service[];
  customProblems: CustomProblem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addItem: (item: Omit<CustomCatalogItem, 'id'>) => Promise<CustomCatalogItem | null>;
  updateItem: (id: string, item: Omit<CustomCatalogItem, 'id'>) => Promise<CustomCatalogItem | null>;
  deleteItem: (id: string) => Promise<void>;
}

function mapSupabaseToCustomCatalogItem(data: any): CustomCatalogItem {
  return {
    id: data.id,
    type: data.type,
    label: data.label,
    value: data.value,
    category: data.category,
    cost: data.cost != null ? Number(data.cost) : null,
    isFrequentlyReplaced: data.is_frequently_replaced ?? false,
    description: data.description,
  };
}

function mapPart(item: CustomCatalogItem): Part {
  return {
    id: item.id,
    isCustom: true,
    label: item.label,
    value: item.value,
    cost: item.cost ?? 0,
    isFrequentlyReplaced: item.isFrequentlyReplaced ?? false,
  };
}

function mapService(item: CustomCatalogItem): Service {
  return {
    id: item.id,
    isCustom: true,
    label: item.label,
    value: item.value,
    cost: item.cost ?? 0,
    category: item.category ?? 'غير محدد',
    description: item.description ?? undefined,
  };
}

function mapProblem(item: CustomCatalogItem): CustomProblem {
  return {
    id: item.id,
    isCustom: true,
    label: item.label,
    value: item.value,
    category: item.category ?? 'غير محدد',
  };
}

export function useCustomCatalog(): UseCustomCatalogReturn {
  const [items, setItems] = useState<CustomCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: supaError } = await supabase
        .from('custom_catalog_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (supaError) throw supaError;
      setItems(((data as any[]) ?? []).map(mapSupabaseToCustomCatalogItem));
    } catch (err) {
      logger.error('Failed to fetch custom catalog items', err, 'custom-catalog');
      setError('تعذر تحميل العناصر المخصصة');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = useCallback(async (
    item: Omit<CustomCatalogItem, 'id'>
  ): Promise<CustomCatalogItem | null> => {
    try {
      const { data, error: supaError } = await supabase
        .from('custom_catalog_items')
        .insert({
          type: item.type,
          label: item.label,
          value: item.value,
          category: item.category ?? null,
          cost: item.cost ?? null,
          is_frequently_replaced: item.isFrequentlyReplaced ?? false,
          description: item.description ?? null,
        })
        .select()
        .single();

      if (supaError) throw new Error(supaError.message);
      const newItem = mapSupabaseToCustomCatalogItem(data);
      setItems((prev) => [newItem, ...prev]);
      return newItem;
    } catch (err) {
      logger.error('Failed to add custom catalog item', err, 'custom-catalog');
      throw err instanceof Error ? err : new Error('فشل إضافة العنصر');
    }
  }, []);

  const updateItem = useCallback(async (
    id: string,
    item: Omit<CustomCatalogItem, 'id'>
  ): Promise<CustomCatalogItem | null> => {
    try {
      const { data, error: supaError } = await supabase
        .from('custom_catalog_items')
        .update({
          type: item.type,
          label: item.label,
          value: item.value,
          category: item.category ?? null,
          cost: item.cost ?? null,
          is_frequently_replaced: item.isFrequentlyReplaced ?? false,
          description: item.description ?? null,
        })
        .eq('id', id)
        .select()
        .single();

      if (supaError) throw new Error(supaError.message);
      const updated = mapSupabaseToCustomCatalogItem(data);
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
      return updated;
    } catch (err) {
      logger.error('Failed to update custom catalog item', err, 'custom-catalog');
      throw err instanceof Error ? err : new Error('فشل تحديث العنصر');
    }
  }, []);

  const deleteItem = useCallback(async (id: string): Promise<void> => {
    try {
      const { error: supaError } = await supabase
        .from('custom_catalog_items')
        .delete()
        .eq('id', id);

      if (supaError) throw new Error(supaError.message);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      logger.error('Failed to delete custom catalog item', err, 'custom-catalog');
      throw err instanceof Error ? err : new Error('فشل حذف العنصر');
    }
  }, []);

  const customParts = useMemo(() => items.filter((i) => i.type === 'part').map(mapPart), [items]);
  const customServices = useMemo(() => items.filter((i) => i.type === 'service').map(mapService), [items]);
  const customProblems = useMemo(() => items.filter((i) => i.type === 'problem').map(mapProblem), [items]);

  return {
    customParts,
    customServices,
    customProblems,
    isLoading,
    error,
    refresh: fetchItems,
    addItem,
    updateItem,
    deleteItem,
  };
}

/** Merge custom items with the hardcoded constants. */
export function useMergedCatalog(): {
  parts: Part[];
  services: Service[];
  problemCategoriesWithCustoms: { title: string; options: { label: string; value: string }[] }[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addItem: (item: Omit<CustomCatalogItem, 'id'>) => Promise<CustomCatalogItem | null>;
  updateItem: (id: string, item: Omit<CustomCatalogItem, 'id'>) => Promise<CustomCatalogItem | null>;
  deleteItem: (id: string) => Promise<void>;
} {
  const {
    customParts,
    customServices,
    customProblems,
    isLoading,
    error,
    refresh,
    addItem,
    updateItem,
    deleteItem,
  } = useCustomCatalog();

  const parts = useMemo(() => {
    const seen = new Set(partsList.map((p) => p.value.toLowerCase()));
    const merged = [...partsList];
    customParts.forEach((cp) => {
      if (!seen.has(cp.value.toLowerCase())) {
        merged.push(cp);
        seen.add(cp.value.toLowerCase());
      }
    });
    return merged;
  }, [customParts]);

  const services = useMemo(() => {
    const seen = new Set(servicesList.map((s) => s.value.toLowerCase()));
    const merged = [...servicesList];
    customServices.forEach((cs) => {
      if (!seen.has(cs.value.toLowerCase())) {
        merged.push(cs);
        seen.add(cs.value.toLowerCase());
      }
    });
    return merged;
  }, [customServices]);

  const problemCategoriesWithCustoms = useMemo(() => {
    const grouped: { title: string; options: { label: string; value: string }[] }[] = problemCategories.map((cat) => ({
      title: cat.title,
      options: [...cat.options],
    }));

    customProblems.forEach((cp) => {
      const category = grouped.find((c) => c.title === cp.category);
      if (category) {
        if (!category.options.some((o) => o.value.toLowerCase() === cp.value.toLowerCase())) {
          category.options.push({ label: cp.label, value: cp.value });
        }
      } else {
        grouped.push({
          title: cp.category,
          options: [{ label: cp.label, value: cp.value }],
        });
      }
    });

    return grouped;
  }, [customProblems]);

  return {
    parts,
    services,
    problemCategoriesWithCustoms,
    isLoading,
    error,
    refresh,
    addItem,
    updateItem,
    deleteItem,
  };
}
