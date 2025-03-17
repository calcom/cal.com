"use client";

import type { User } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import dayjs from "@calcom/dayjs";
import { useFlagMap } from "@calcom/features/flags/context/provider";
import { useEmailVerifyCheck } from "@calcom/trpc/react/hooks/useEmailVerifyCheck";
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
  const query = useMeQuery();
  const user = query.data;
  const flags = useFlagMap();

  const { data: email } = useEmailVerifyCheck();

  const needsEmailVerification = !email?.isVerified && flags["email-verification"];

  const isRedirectingToOnboarding = user && shouldShowOnboarding(user);

  useEffect(() => {
    if (isRedirectingToOnboarding && !needsEmailVerification) {
      router.replace("/getting-started");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRedirectingToOnboarding, needsEmailVerification]);

  return {
    isRedirectingToOnboarding,
  };
}
