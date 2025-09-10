"use client";

import { useRedirectToLoginIfUnauthenticated } from "@calcom/features/auth/lib/hooks/useRedirectToLoginIfUnauthenticated";
import { useRedirectToOnboardingIfNeeded } from "@calcom/features/auth/lib/hooks/useRedirectToOnboardingIfNeeded";

interface RoutingFormsShellProps {
  children: React.ReactNode;
}

export default function RoutingFormsShell({ children }: RoutingFormsShellProps) {
  useRedirectToLoginIfUnauthenticated();
  useRedirectToOnboardingIfNeeded();

  return <>{children}</>;
}
