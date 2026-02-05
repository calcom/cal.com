"use client";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import BillingCredits from "~/settings/billing/components/BillingCredits";
import { InvoicesTable } from "~/settings/billing/components/InvoicesTable";

interface CtaRowProps {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}

declare global {
  interface Window {
    Support?: {
      open: () => void;
      shouldShowTriggerButton: (showTrigger: boolean) => void;
    };
  }
}

export const CtaRow = ({ title, description, className, children }: CtaRowProps) => {
  return (
    <>
      <section className={classNames("text-default flex flex-col sm:flex-row", className)}>
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p>{description}</p>
        </div>
        <div className="shrink-0 pt-3 sm:ml-auto sm:pl-3 sm:pt-0">{children}</div>
      </section>
    </>
  );
};

const BillingView = () => {
  const pathname = usePathname();
  const session = useSession();
  const { t } = useLocale();
  const returnTo = pathname;
  const [showSkipTrialDialog, setShowSkipTrialDialog] = useState(false);
  const utils = trpc.useUtils();

  // Determine the billing context and extract appropriate team/org ID
  const getTeamIdFromContext = () => {
    if (!pathname) return null;

    // Team billing: /settings/teams/{id}/billing
    if (pathname.includes("/teams/") && pathname.includes("/billing")) {
      const teamIdMatch = pathname.match(/\/teams\/(\d+)\/billing/);
      return teamIdMatch ? teamIdMatch[1] : null;
    }

    // Organization billing: /settings/organizations/billing
    if (pathname.includes("/organizations/billing")) {
      const orgId = session.data?.user?.org?.id;
      return typeof orgId === "number" ? orgId.toString() : null;
    }
  };

  const teamId = getTeamIdFromContext();
  const teamIdNumber = teamId ? parseInt(teamId, 10) : null;

  const { data: subscriptionStatus, isLoading: isLoadingStatus } =
    trpc.viewer.teams.getSubscriptionStatus.useQuery(
      { teamId: teamIdNumber ?? 0 },
      { enabled: !!teamIdNumber }
    );

  const skipTrialMutation = trpc.viewer.teams.skipTrialForTeam.useMutation({
    onSuccess: () => {
      showToast(t("trial_skipped_successfully"), "success");
      setShowSkipTrialDialog(false);
      // Invalidate the subscription status cache to hide the skip trial button
      if (teamIdNumber) {
        utils.viewer.teams.getSubscriptionStatus.invalidate({ teamId: teamIdNumber });
      }
    },
    onError: (error) => {
      showToast(error.message || t("error_skipping_trial"), "error");
    },
  });

  const billingHref = teamId
    ? `/api/integrations/stripepayment/portal?teamId=${teamId}&returnTo=${WEBAPP_URL}${returnTo}`
    : `/api/integrations/stripepayment/portal?returnTo=${WEBAPP_URL}${returnTo}`;

  const onContactSupportClick = async () => {
    if (window.Support) {
      window.Support.open();
    }
  };

  const handleSkipTrial = () => {
    if (teamIdNumber) {
      skipTrialMutation.mutate({ teamId: teamIdNumber });
    }
  };

  const isTrialing = subscriptionStatus?.isTrialing && teamIdNumber;

  return (
    <>
      <div className="bg-cal-muted border-muted mt-5 rounded-xl border p-1">
        <div className="bg-default border-muted flex rounded-[10px] border px-5 py-4">
          <div className="flex w-full flex-col gap-1">
            <h3 className="text-emphasis text-sm font-semibold leading-none">{t("manage_billing")}</h3>
            <p className="text-subtle text-sm font-medium leading-tight">
              {t("view_and_manage_billing_details")}
            </p>
          </div>
          <Button color="primary" href={billingHref} target="_blank" size="sm" EndIcon="external-link">
            {t("billing_portal")}
          </Button>
        </div>
        {isTrialing && (
          <div className="bg-default border-muted mt-1 flex rounded-[10px] border px-5 py-4">
            <div className="flex w-full flex-col gap-1">
              <h3 className="text-emphasis text-sm font-semibold leading-none">{t("skip_trial")}</h3>
              <p className="text-subtle text-sm font-medium leading-tight">{t("skip_trial_description")}</p>
            </div>
            <Button
              color="secondary"
              size="sm"
              onClick={() => setShowSkipTrialDialog(true)}
              loading={isLoadingStatus}>
              {t("skip_trial")}
            </Button>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-5">
          <p className="text-subtle text-sm font-medium leading-tight">{t("need_help")}</p>
          <Button color="secondary" size="sm" onClick={onContactSupportClick}>
            {t("contact_support")}
          </Button>
        </div>
      </div>
      <BillingCredits />
      <InvoicesTable />

      <Dialog open={showSkipTrialDialog} onOpenChange={setShowSkipTrialDialog}>
        <DialogContent>
          <DialogHeader title={t("skip_trial_confirmation_title")} />
          <p className="text-subtle text-sm">{t("skip_trial_confirmation_description")}</p>
          <DialogFooter>
            <Button color="minimal" onClick={() => setShowSkipTrialDialog(false)}>
              {t("cancel")}
            </Button>
            <Button color="primary" onClick={handleSkipTrial} loading={skipTrialMutation.isPending}>
              {t("skip_trial")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BillingView;
