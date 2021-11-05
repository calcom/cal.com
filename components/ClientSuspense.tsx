import { Suspense, SuspenseProps } from "react";

/**
 * Wrapper around `<Suspense />` which will render the `fallback` when on server
 * Can be simply replaced by `<Suspense />` once React 18 is ready.
 */
export const ClientSuspense = (props: SuspenseProps) => {
  return <>{typeof window !== "undefined" ? <Suspense {...props} /> : props.fallback}</>;
};
