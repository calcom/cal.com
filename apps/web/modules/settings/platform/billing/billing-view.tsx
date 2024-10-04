"use client";

import { usePathname } from "next/navigation";

import { useIntercom } from "@calcom/features/ee/support/lib/intercom/useIntercom";
import Shell from "@calcom/features/shell/Shell";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui";

import NoPlatformPlan from "@components/settings/platform/dashboard/NoPlatformPlan";
import { useGetUserAttributes } from "@components/settings/platform/hooks/useGetUserAttributes";

import { CtaRow } from "~/settings/billing/billing-view";

export default function PlatformBillingUpgrade() {
  const pathname = usePathname();
  const { t } = useLocale();
  const { open } = useIntercom();
  const returnTo = pathname;
  const billingHref = `/api/integrations/stripepayment/portal?returnTo=${WEBAPP_URL}${returnTo}`;

  const onContactSupportClick = async () => {
    await open();
  };
  const { isUserLoading, isUserBillingDataLoading, isPlatformUser, userBillingData } = useGetUserAttributes();

  if (isUserLoading || (isUserBillingDataLoading && !userBillingData)) {
    return <div className="m-5">Loading...</div>;
  }

  if (!isPlatformUser) return <NoPlatformPlan />;

  return (
    <div>
      <Shell
        heading="Platform billing"
        title="Platform billing"
        hideHeadingOnMobile
        withoutMain={false}
        subtitle="Manage all things billing"
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
