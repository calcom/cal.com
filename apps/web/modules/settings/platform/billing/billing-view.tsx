"use client";

import { usePathname } from "next/navigation";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { DialogTrigger, ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";
import { PlatformPricing } from "@calcom/web/components/settings/platform/pricing/platform-pricing/index";

import { useUnsubscribeTeamToStripe } from "@lib/hooks/settings/platform/billing/useUnsubscribeTeamToStripe";

import NoPlatformPlan from "@components/settings/platform/dashboard/NoPlatformPlan";
import { useGetUserAttributes } from "@components/settings/platform/hooks/useGetUserAttributes";

import { CtaRow } from "~/settings/billing/billing-view";
import Shell from "~/shell/Shell";

declare global {
  interface Window {
    Support?: {
      open: () => void;
      shouldShowTriggerButton: (showTrigger: boolean) => void;
    };
  }
}

export default function PlatformBillingUpgrade() {
  const pathname = usePathname();
  const { t } = useLocale();
  const { isUserLoading, isUserBillingDataLoading, isPlatformUser, userBillingData, isPaidUser, userOrgId } =
    useGetUserAttributes();

  const returnTo = pathname;
  const teamId = `teamId=${userOrgId}`;
  const billingHref = `/api/integrations/stripepayment/portal?returnTo=${WEBAPP_URL}${returnTo}&${teamId}`;

  const onContactSupportClick = async () => {
    if (window.Support) {
      window.Support.open();
    }
  };

  const { mutateAsync: removeTeamSubscription, isPending: isRemoveTeamSubscriptionLoading } =
    useUnsubscribeTeamToStripe({
      onSuccess: () => {
        window.location.href = "/settings/platform/";
        showToast(t("team_subscription_cancelled_successfully"), "success");
      },
      onError: () => {
        showToast(t("team_subscription_cancellation_error"), "error");
      },
      teamId: userOrgId,
    });

  if (isUserLoading || (isUserBillingDataLoading && !userBillingData)) {
    return <div className="m-5">{t("loading")}</div>;
  }

  if (isPlatformUser && !isPaidUser)
    return (
      <PlatformPricing
        teamId={userOrgId}
        heading={
          <div className="mb-5 text-center text-2xl font-semibold">
            <h1>{t("subscribe_to_platform")}</h1>
          </div>
        }
      />
    );

  if (!isPlatformUser)
    return (
      <div>
        <Shell isPlatformUser={true} withoutMain={false} SidebarContainer={<></>}>
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
        subtitle={t("manage_billing_description")}
        isPlatformUser={true}>
        <>
          <div className="border-subtle stack-y-6 sm:stack-y-8 rounded-lg border px-6 py-8 text-sm">
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

            <CtaRow title="Cancel subscription" description={t("Cancel your existing platform subscription")}>
              <CancelSubscriptionButton
                buttonClassName="hidden me-2 sm:inline"
                isPending={isRemoveTeamSubscriptionLoading}
                handleDelete={() => {
                  removeTeamSubscription();
                }}
              />
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

const CancelSubscriptionButton = ({
  buttonClassName,
  isPending,
  onDeleteConfirmed,
  handleDelete,
}: {
  onDeleteConfirmed?: () => void;
  buttonClassName: string;
  handleDelete: () => void;
  isPending: boolean;
}) => {
  const { t } = useLocale();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button color="destructive" className={buttonClassName}>
          {t("cancel")}
        </Button>
      </DialogTrigger>

      <ConfirmationDialogContent
        isPending={isPending}
        variety="danger"
        title={t("cancel_subscription")}
        confirmBtnText={t("confirm_subscription_cancellation")}
        loadingText={t("confirm_subscription_cancellation")}
        cancelBtnText={t("back")}
        onConfirm={() => {
          handleDelete();
          onDeleteConfirmed?.();
        }}>
        {t("cancel_subscription_description")}
      </ConfirmationDialogContent>
    </Dialog>
  );
};
