/**
 * useDrafts - manages auto-saving wizard drafts to localStorage.
 */
import { useState, useEffect, useCallback } from "react";
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
