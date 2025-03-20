"use client";

import { usePathname } from "next/navigation";

import Shell from "@calcom/features/shell/Shell";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { PlatformPricing } from "@calcom/web/components/settings/platform/pricing/platform-pricing/index";

import NoPlatformPlan from "@components/settings/platform/dashboard/NoPlatformPlan";
import { useGetUserAttributes } from "@components/settings/platform/hooks/useGetUserAttributes";

import { CtaRow } from "~/settings/billing/billing-view";

declare global {
  interface Window {
    Plain?: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      init: (config: any) => void;
      open: () => void;
    };
  }
}

export default function PlatformBillingUpgrade() {
  const pathname = usePathname();
  const { t } = useLocale();
  const returnTo = pathname;
  const billingHref = `/api/integrations/stripepayment/portal?returnTo=${WEBAPP_URL}${returnTo}`;

  const onContactSupportClick = async () => {
    if (window.Plain) {
      window.Plain.open();
    }
  };
  const { isUserLoading, isUserBillingDataLoading, isPlatformUser, userBillingData, isPaidUser, userOrgId } =
    useGetUserAttributes();

  if (isUserLoading || (isUserBillingDataLoading && !userBillingData)) {
    return <div className="m-5">Loading...</div>;
  }

  if (isPlatformUser && !isPaidUser)
    return (
      <PlatformPricing
        teamId={userOrgId}
        heading={
          <div className="mb-5 text-center text-2xl font-semibold">
            <h1>Subscribe to Platform</h1>
          </div>
        }
      />
    );

  if (!isPlatformUser)
    return (
      <div>
        <Shell withoutSeo={true} isPlatformUser={true} withoutMain={false} SidebarContainer={<></>}>
          <NoPlatformPlan />
        </Shell>
      </div>
    );

  return (
    <div>
      <Shell
        heading={t("platform_billing")}
        title={t("platform_billing")}
        withoutMain={false}
        withoutSeo={true}
        subtitle={t("manage_billing_description")}
        isPlatformUser={true}>
        <>
          <div className="border-subtle space-y-6 rounded-lg border px-6 py-8 text-sm sm:space-y-8">
            <CtaRow
              title={t("view_and_manage_billing_details")}
              description={t("view_and_edit_billing_details")}>
              <Button color="primary" href={billingHref} target="_blank" EndIcon="external-link">
                {t("billing_portal")}
              </Button>
            </CtaRow>

            <hr className="border-subtle" />

            <CtaRow
              title="Change plan"
              description={t("Want to change your existing plan or check out other plans?")}>
              <Button href="/settings/platform/plans" color="secondary">
                Plans
              </Button>
            </CtaRow>

            <hr className="border-subtle" />

            <CtaRow title={t("need_anything_else")} description={t("further_billing_help")}>
              <Button color="secondary" onClick={onContactSupportClick}>
                {t("contact_support")}
              </Button>
            </CtaRow>
          </div>
        </>
      </Shell>
    </div>
  );
}
