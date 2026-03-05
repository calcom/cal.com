import { useEffect } from "react";

/**
 * Runs a callback once after hydration, on the client only.
 * Use this to defer browser-only logic (e.g. reading localStorage)
 * and avoid SSR hydration mismatches.
 */
export function useClientOnly(callback: () => void) {
  useEffect(callback, []);
}
