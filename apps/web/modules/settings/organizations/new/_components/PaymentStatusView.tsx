"use client";

import { useSession } from "next-auth/react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { useEffect } from "react";

import { useOnboardingStore } from "@calcom/features/ee/organizations/lib/onboardingStore";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Button, Icon, SkeletonContainer, SkeletonText } from "@calcom/ui";

const PaymentStatusView = () => {
  const { t } = useLocale();
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const paymentStatus = searchParams?.get("paymentStatus");
  const paymentError = searchParams?.get("error");
  const orgOwnerEmail = searchParams?.get("orgOwnerEmail");
  const impersonationAttempted = searchParams?.get("impersonationAttempted");
  const { name } = useOnboardingStore();
  const loggedInUser = session.data?.user;
  const shouldImpersonate =
    !impersonationAttempted && loggedInUser && orgOwnerEmail ? loggedInUser.email !== orgOwnerEmail : false;
  const canImpersonate = loggedInUser?.role === "ADMIN";

  const [isImpersonating, setIsImpersonating] = useState(false);
  const { data: organization, isLoading } = trpc.viewer.organizations.listCurrent.useQuery(undefined, {
    enabled: !shouldImpersonate,
    refetchInterval: 2000, // Poll every 2 seconds until org is created
  });

  useEffect(() => {
    if (organization) {
      // Clear persisted store data after successful checkout as it is now in DB
      useOnboardingStore.persist.clearStorage();
      // Organization is created, redirect to next step
      router.push(`/settings/organizations`);
    }
  }, [organization, router]);

  if (session.status === "loading" || isLoading || isImpersonating) {
    return (
      <SkeletonContainer>
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="mt-4 h-8 w-full" />
      </SkeletonContainer>
    );
  }

  if (shouldImpersonate && canImpersonate && !isImpersonating) {
    setIsImpersonating(true);
    signIn("impersonation-auth", {
      username: orgOwnerEmail,
      callbackUrl: `${pathname}?paymentStatus=${paymentStatus}&error=${paymentError}&orgOwnerEmail=${orgOwnerEmail}&impersonationAttempted=true`,
    });
  }

  if (paymentStatus === "failed" || paymentError) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center space-y-6 px-4 sm:px-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <Icon name="x" className="h-6 w-6 text-red-600" />
        </div>
        <div className="text-center">
          <h1 className="font-cal text-emphasis text-2xl">{t("payment_failed")}</h1>
          <p className="text-default mt-2 text-sm">{paymentError || t("payment_failed_description")}</p>
        </div>
        <Button color="secondary" href="/settings/organizations/new/onboard-members">
          {t("try_again")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[500px] flex-col items-center justify-center space-y-6 px-4 sm:px-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
        <Icon name="check" className="h-6 w-6 text-green-600 dark:text-green-400" />
      </div>
      <div className="text-center">
        <h1 className="font-cal text-emphasis text-2xl">{t("payment_successful")}</h1>
        <p className="text-default mt-2 text-sm">{t("creating_your_organization", { orgName: name })}</p>
        <p className="text-subtle mt-1 text-sm">{t("this_may_take_a_few_seconds")}</p>
      </div>
    </div>
  );
};

export default PaymentStatusView;
