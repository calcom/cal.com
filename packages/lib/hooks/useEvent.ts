import { useLayoutEffect, useMemo, useRef } from "react";

type Fn<A extends any[], R> = (...args: A) => R;

export const useEvent = <A extends any[], R>(fn: Fn<A, R>): Fn<A, R> => {
  const ref = useRef<Fn<A, R>>(fn);
  useLayoutEffect(() => {
    ref.current = fn;
  });
  return useMemo(
    () =>
      (...args: A): R => {
        const { current } = ref;
        return current(...args);
      },
    []
  );
};
