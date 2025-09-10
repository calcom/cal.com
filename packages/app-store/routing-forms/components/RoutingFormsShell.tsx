"use client";

import { useRedirectToLoginIfUnauthenticated } from "@calcom/features/auth/lib/hooks/useRedirectToLoginIfUnauthenticated";

interface RoutingFormsShellProps {
  children: React.ReactNode;
}

export default function RoutingFormsShell({ children }: RoutingFormsShellProps) {
  useRedirectToLoginIfUnauthenticated();

  return <>{children}</>;
}
