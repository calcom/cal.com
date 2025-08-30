"use client";

import type { User } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import dayjs from "@calcom/dayjs";
import { useFlagMap } from "@calcom/features/flags/context/provider";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";

const shouldShowOnboarding = (
  user: Pick<User, "createdDate" | "completedOnboarding"> & {
    organizationId: number | null;
  }
) => {
  return (
    !user.completedOnboarding &&
    !user.organizationId &&
    dayjs(user.createdDate).isAfter(ONBOARDING_INTRODUCED_AT)
  );
};

export const ONBOARDING_INTRODUCED_AT = dayjs("September 1 2021").toISOString();

export const ONBOARDING_NEXT_REDIRECT = {
  redirect: {
    permanent: false,
    destination: "/getting-started",
  },
} as const;

export function useRedirectToOnboardingIfNeeded() {
  const router = useRouter();
  const { data: user, isLoading } = useMeQuery();
  const flags = useFlagMap();

  const needsEmailVerification =
    !user?.emailVerified && user?.identityProvider === "CAL" && flags["email-verification"];

  const shouldRedirectToOnboarding = user && shouldShowOnboarding(user);
  const canRedirect = !isLoading && shouldRedirectToOnboarding && !needsEmailVerification;

  useEffect(() => {
    if (canRedirect) {
      router.replace("/getting-started");
    }
  }, [canRedirect, router]);

  return {
    isLoading,
    shouldRedirectToOnboarding,
  };
}
