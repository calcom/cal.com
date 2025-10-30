"use client";

import { useRedirectToLoginIfUnauthenticated } from "@calcom/features/auth/lib/hooks/useRedirectToLoginIfUnauthenticated";

export function RoutingFormAuthGuard({ children }: { children: React.ReactNode }) {
  useRedirectToLoginIfUnauthenticated();

  return <>{children}</>;
}
