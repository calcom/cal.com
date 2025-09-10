"use client";

import { useRedirectToLoginIfUnauthenticated } from "@calcom/features/auth/lib/hooks/useRedirectToLoginIfUnauthenticated";

export function RoutingFormsShell({ children }: { children: React.ReactNode }) {
  useRedirectToLoginIfUnauthenticated();

  return <>{children}</>;
}
