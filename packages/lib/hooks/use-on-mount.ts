import type { EffectCallback } from "react";
import { useEffect, useRef } from "react";

/**
 * Runs a callback once when the component mounts.
 * Accepts an optional cleanup function (same as useEffect's return).
 */
export function useOnMount(callback: EffectCallback): void {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally mount-only
  useEffect(callback, []);
}

/**
 * Runs a callback once when the component unmounts.
 * The callback ref is kept fresh so it always captures the latest closure.
 */
export function useOnUnmount(callback: () => void): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally unmount-only
  useEffect(() => () => callbackRef.current(), []);
}
