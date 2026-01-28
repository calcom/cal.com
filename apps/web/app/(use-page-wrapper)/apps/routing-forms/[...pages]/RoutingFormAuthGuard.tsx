"use client";

import { useRedirectToLoginIfUnauthenticated } from "@calcom/web/modules/auth/hooks/useRedirectToLoginIfUnauthenticated";

export function RoutingFormAuthGuard({ children }: { children: React.ReactNode }) {
  useRedirectToLoginIfUnauthenticated();

  return <>{children}</>;
}
