import { Suspense, SuspenseProps } from "react";

export const ClientSuspense = (props: SuspenseProps) => {
  if (!process.browser) {
    return props.fallback ?? null;
  }
  return <Suspense {...props} />;
};
