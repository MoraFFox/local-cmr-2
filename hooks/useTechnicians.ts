/**
 * useTechnicians - fetches and caches technician display names from Supabase.
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { logger } from "../utils/logger";
import type { MaintenanceRecord } from "../types";

interface Technician {
  id: string;
  name: string;
}

export function useTechnicians(isOnline: boolean) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  useEffect(() => {
    if (!isOnline) return;

    const fetchTechnicians = async () => {
      try {
        const { data, error } = await supabase
          .from("technicians")
          .select("id, name");

        if (error) {
          logger.error("Error fetching technicians", error, "data");
          return;
        }

        setTechnicians(
          (data || []).map((t: { id: string; name: string }) => ({
            id: t.id,
            name: t.name,
          })),
        );
      } catch (err) {
        logger.error("Error fetching technicians", err, "data");
      }
    };

    fetchTechnicians();
  }, [isOnline]);

  const techniciansMap = useMemo(
    () => new Map(technicians.map((t) => [t.id, t])),
    [technicians],
  );

  const getTechnicianDisplayName = useCallback(
    (record: MaintenanceRecord): string => {
      if (record.technicianId) {
        const technician = techniciansMap.get(record.technicianId);
        if (technician) return technician.name;
      }
      return record.baristaName || "Unknown";
    },
    [techniciansMap],
  );

  return { technicians, techniciansMap, getTechnicianDisplayName };
}
