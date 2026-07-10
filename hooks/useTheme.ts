/**
 * useTheme - theme management hook.
 * Persists theme preference to localStorage and applies the 'dark' class.
 */
import { useState, useEffect, useCallback } from "react";
import { STORAGE_KEYS } from "../utils/sharedConstants";

export type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";

  const stored = localStorage.getItem(STORAGE_KEYS.THEME);
  if (stored === "dark" || stored === "light") return stored;

  if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";

  return "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  return { theme, toggleTheme } as const;
}
