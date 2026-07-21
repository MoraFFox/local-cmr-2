/**
 * useOfflineQueue - processes the offline mutation queue.
 * Provides processOfflineQueue function and sync state.
 */
import { useState, useCallback, useRef } from "react";
import { supabase } from "../supabaseClient";
import {
  getQueue,
  removeFromQueue,
  type QueueItem,
} from "../utils/offlineQueue";
import { logger } from "../utils/logger";
import { useToast } from "../components/ToastContext";
import type { FormData } from "../types";

export function useOfflineQueue() {
  const [isSyncing, setIsSyncing] = useState(false);
  const isProcessingRef = useRef(false);
  const { showToast } = useToast();

  const processOfflineQueue = useCallback(
    async (onSyncComplete?: () => void) => {
      if (isProcessingRef.current) {
        logger.debug(
          "Queue processing already in progress, skipping",
          undefined,
          "sync",
        );
        return;
      }

      const queue = await getQueue();
      if (queue.length === 0) return;

      isProcessingRef.current = true;
      setIsSyncing(true);
      logger.info(`Starting sync of ${queue.length} items`, undefined, "sync");

      try {
        for (const item of queue) {
          try {
            let error: { message?: string; code?: string } | null = null;

            if (item.action === "CREATE") {
              const { id, pendingSync, ...dataToSubmit } =
                item.payload as FormData;
              const { error: insertError } = await supabase
                .from("companies")
                .insert([{ form_data: dataToSubmit }]);
              error = insertError;
            } else if (item.action === "UPDATE") {
              const { id, pendingSync, ...dataToSubmit } =
                item.payload as FormData;
              if (id && id > 0) {
                const { error: updateError } = await supabase
                  .from("companies")
                  .update({ form_data: dataToSubmit })
                  .eq("id", id);
                error = updateError;
              } else {
                logger.warn("Skipping update for invalid ID", { id }, "sync");
              }
            } else if (item.action === "DELETE") {
              const id = item.payload as number;
              if (id > 0) {
                const { error: deleteError } = await supabase
                  .from("companies")
                  .delete()
                  .eq("id", id);
                error = deleteError;
              }
            }

            if (error) {
              logger.error(
                `Sync error for item`,
                { itemId: item.id, error },
                "sync",
              );
              showToast(
                `خطأ في مزامنة العنصر: ${error.message || "خطأ غير معروف"}`,
                "error",
              );

              const isDataError =
                error.code &&
                (error.code.startsWith("PGRST") ||
                  error.code.startsWith("42"));
              if (isDataError) {
                await removeFromQueue(item.id);
              } else {
                break; // Network error - retry later
              }
            } else {
              await removeFromQueue(item.id);
            }
          } catch (e) {
            logger.error(
              `Sync exception for item`,
              { itemId: item.id, error: e },
              "sync",
            );
            showToast(
              "خطأ في المزامنة - سيتم إعادة المحاولة لاحقاً",
              "warning",
            );
            break;
          }
        }

        showToast("تمت المزامنة بنجاح", "success");
        onSyncComplete?.();
      } finally {
        isProcessingRef.current = false;
        setIsSyncing(false);
      }
    },
    [showToast],
  );

  return { isSyncing, processOfflineQueue };
}
