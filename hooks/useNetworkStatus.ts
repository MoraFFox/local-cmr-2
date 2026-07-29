/**
 * useNetworkStatus - tracks online/offline state.
 */
import { useState, useEffect, useCallback, useRef } from "react";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  const handleOnline = useCallback(() => setIsOnline(true), []);
  const handleOffline = useCallback(() => setIsOnline(false), []);

  useEffect(() => {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return isOnline;
}
