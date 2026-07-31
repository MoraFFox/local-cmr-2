/**
 * useDrafts - manages auto-saving wizard drafts to localStorage.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import type { FormData } from "../types";
import { STORAGE_KEYS } from "../utils/sharedConstants";

export interface Draft {
  id: string;
  timestamp: number;
  formData: FormData;
  currentStep: number;
}

function loadDrafts(): Draft[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.DRAFTS);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function persistDrafts(drafts: Draft[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DRAFTS, JSON.stringify(drafts));
  } catch {
    // localStorage full or unavailable
  }
}

export function useDrafts(
  formData: FormData,
  currentStep: number,
  isInFormView: boolean,
) {
  const [drafts, setDrafts] = useState<Draft[]>(loadDrafts);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

  // Keep the latest values in refs so the pagehide/beforeunload flush (which
  // only captures the values from its closure) always writes the freshest state.
  const latestRef = useRef({ formData, currentStep, isInFormView, currentDraftId });
  latestRef.current = { formData, currentStep, isInFormView, currentDraftId };

  // Mirror of `drafts` used by the unload flush. The flush must NOT go through
  // a setState updater: during pagehide/beforeunload React will not schedule a
  // re-render, so the updater would never run and the draft would be lost.
  // Instead we persist directly to localStorage from this ref.
  const draftsRef = useRef<Draft[]>(drafts);
  draftsRef.current = drafts;

  // Auto-save draft with debounce
  useEffect(() => {
    if (!isInFormView) return;

    const isFormEmpty =
      !formData.companyName &&
      !formData.email &&
      !formData.taxNumber &&
      !formData.location;

    if (isFormEmpty && !currentDraftId) return;

    const saveTimer = setTimeout(() => {
      const timestamp = Date.now();
      const draftId = currentDraftId || `draft_${timestamp}`;

      if (!currentDraftId) {
        setCurrentDraftId(draftId);
      }

      setDrafts((prev) => {
        const otherDrafts = prev.filter((d) => d.id !== draftId);
        const updatedDraft: Draft = { id: draftId, timestamp, formData, currentStep };
        const newDrafts = [updatedDraft, ...otherDrafts].sort(
          (a, b) => b.timestamp - a.timestamp,
        );
        persistDrafts(newDrafts);
        return newDrafts;
      });
    }, 1000);

    return () => clearTimeout(saveTimer);
  }, [formData, currentStep, currentDraftId, isInFormView]);

  // Flush the latest draft synchronously when the page is hidden or about to
  // be unloaded (browser/tab close, refresh). The debounced save above may not
  // fire if the user closes the tab within the debounce window; this writes
  // the freshest state directly to localStorage (no setState updater, which
  // React would not run while the page is unloading) so no work is lost.
  useEffect(() => {
    const flush = () => {
      const latest = latestRef.current;
      if (!latest.isInFormView) return;

      const isFormEmpty =
        !latest.formData.companyName &&
        !latest.formData.email &&
        !latest.formData.taxNumber &&
        !latest.formData.location;

      if (isFormEmpty && !latest.currentDraftId) return;

      const timestamp = Date.now();
      let draftId = latest.currentDraftId;
      if (!draftId) {
        // Narrow race: if the debounced save just persisted this exact snapshot
        // (and its setCurrentDraftId re-render hasn't committed yet), reuse that
        // draft's id instead of creating a duplicate alongside it.
        const newest = draftsRef.current[0];
        if (newest && JSON.stringify(newest.formData) === JSON.stringify(latest.formData)) {
          draftId = newest.id;
        } else {
          draftId = `draft_${timestamp}`;
        }
      }
      const otherDrafts = draftsRef.current.filter((d) => d.id !== draftId);
      const updatedDraft: Draft = {
        id: draftId,
        timestamp,
        formData: latest.formData,
        currentStep: latest.currentStep,
      };
      const newDrafts = [updatedDraft, ...otherDrafts].sort(
        (a, b) => b.timestamp - a.timestamp,
      );
      persistDrafts(newDrafts);
      draftsRef.current = newDrafts;

      if (!latest.currentDraftId) {
        setCurrentDraftId(draftId);
      }
    };

    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
    };
    // Deliberately registered once — the handler only reads refs (latestRef /
    // draftsRef), never stale props, so no deps are needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deleteDraftById = useCallback((draftId: string) => {
    setDrafts((prev) => {
      const newDrafts = prev.filter((d) => d.id !== draftId);
      persistDrafts(newDrafts);
      return newDrafts;
    });
  }, []);

  const discardCurrent = useCallback(() => {
    if (currentDraftId) {
      setDrafts((prev) => {
        const newDrafts = prev.filter((d) => d.id !== currentDraftId);
        persistDrafts(newDrafts);
        return newDrafts;
      });
    }
    setCurrentDraftId(null);
  }, [currentDraftId]);

  return {
    drafts,
    setDrafts,
    currentDraftId,
    setCurrentDraftId,
    deleteDraftById,
    discardCurrent,
  };
}
