"use client";

import { useRedirectToLoginIfUnauthenticated } from "@calcom/features/auth/lib/hooks/useRedirectToLoginIfUnauthenticated";
import { useRedirectToOnboardingIfNeeded } from "@calcom/features/auth/lib/hooks/useRedirectToOnboardingIfNeeded";

interface RoutingFormsShellProps {
  children: React.ReactNode;
  isPublic?: boolean;
}

export default function RoutingFormsShell({ children, isPublic = false }: RoutingFormsShellProps) {
  useRedirectToLoginIfUnauthenticated(isPublic);
  useRedirectToOnboardingIfNeeded();

  return <>{children}</>;
}
