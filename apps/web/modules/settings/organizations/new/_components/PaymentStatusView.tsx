"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useOnboarding } from "@calcom/features/ee/organizations/lib/onboardingStore";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";

const PaymentStatusView = () => {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentStatus = searchParams?.get("paymentStatus");
  const paymentError = searchParams?.get("error");
  const { useOnboardingStore } = useOnboarding();
  const [organizationCreated, setOrganizationCreated] = useState<boolean>(false);
  const { name } = useOnboardingStore();

  const { data: organization } = trpc.viewer.organizations.listCurrent.useQuery(undefined, {
    refetchInterval: 2000, // Poll every 2 seconds until org is created
    enabled: !organizationCreated,
  });

  useEffect(() => {
    if (organization) {
      setOrganizationCreated(true);
      // Organization is created, redirect to next step
      router.push(`/settings/organizations?newOrganizationModal=true`);
    }
  }, [organization, router, useOnboardingStore]);

  if (paymentStatus === "failed" || paymentError) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center stack-y-6 px-4 sm:px-6">
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
    <div className="flex min-h-[500px] flex-col items-center justify-center stack-y-6 px-4 sm:px-6">
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
