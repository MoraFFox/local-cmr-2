/**
 * useAiNotes — reusable AI note generation hook.
 * Encapsulates Gemini AI client initialization and the suggestBaristaNotes function.
 * Can be used in any view that needs AI-generated barista performance notes.
 */
import { useCallback } from "react";
import { GoogleGenAI } from "@google/genai";
import { useToast } from "../components/ToastContext";
import { logger } from "../utils/logger";

// Module-level AI client — stateless, depends only on env var
const ai = process.env.API_KEY
  ? new GoogleGenAI({ apiKey: process.env.API_KEY })
  : null;

export function useAiNotes() {
  const { showToast } = useToast();

  const suggestBaristaNotes = useCallback(
    async (name: string): Promise<string | null> => {
      if (!navigator.onLine) {
        showToast("اقتراحات الذكاء الاصطناعي غير متوفرة دون اتصال.", "warning");
        return null;
      }
      if (!ai) {
        showToast("مفتاح Gemini API غير مكون بشكل صحيح.", "error");
        return null;
      }
      try {
        const resp = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `Based on a barista named ${name}, write a brief, positive, and professional performance note for their file.`,
        });
        return resp.text?.trim() ?? null;
      } catch (e) {
        logger.error("Error generating notes", e, "ai");
        showToast("تعذر الحصول على اقتراح ذكاء اصطناعي.", "error");
        return null;
      }
    },
    [showToast],
  );

  return { suggestBaristaNotes };
}
