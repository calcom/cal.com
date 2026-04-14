"use client";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/i18n/useLocale";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { showToast } from "@calcom/ui/components/toast";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@coss/ui/components/alert-dialog";
import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameFooter,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { ExternalLinkIcon } from "@coss/ui/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import { ActiveUserBreakdown } from "~/settings/billing/components/ActiveUserBreakdown";
import { HighWaterMarkBilling } from "~/settings/billing/components/HighWaterMarkBilling";
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
      <section className={classNames("flex flex-col sm:flex-row", className)}>
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

  const teamIdNumber = useMemo(() => {
    if (!pathname) return null;

    if (pathname.includes("/teams/") && pathname.includes("/billing")) {
      const teamIdMatch = pathname.match(/\/teams\/(\d+)\/billing/);
      return teamIdMatch ? parseInt(teamIdMatch[1], 10) : null;
    }

    if (pathname.includes("/organizations/billing")) {
      const orgId = session.data?.user?.org?.id;
      return typeof orgId === "number" ? orgId : null;
    }

    return null;
  }, [pathname, session.data?.user?.org?.id]);

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

  const billingHref = teamIdNumber
    ? `/api/integrations/stripepayment/portal?teamId=${teamIdNumber}&returnTo=${WEBAPP_URL}${returnTo}`
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
    <div className="flex flex-col gap-4">
      <CardFrame>
        <Card>
          <CardPanel>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardFrameHeader className="p-0">
                <CardFrameTitle>{t("manage_billing")}</CardFrameTitle>
                <CardFrameDescription>
                  {t("view_and_manage_billing_details")}
                </CardFrameDescription>
              </CardFrameHeader>
              <Button
                variant="default"
                render={<Link href={billingHref} target="_blank" rel="noopener noreferrer" />}>
                {t("billing_portal")}
                <ExternalLinkIcon aria-hidden="true" />
              </Button>
            </div>
          </CardPanel>
        </Card>
        <CardFrameFooter className="flex items-center justify-end gap-2">
          <p className="text-muted-foreground text-xs">{t("need_help")}</p>
          <Button variant="outline" size="xs" onClick={onContactSupportClick}>
            {t("contact_support")}
          </Button>
        </CardFrameFooter>
      </CardFrame>
      {isTrialing && (
        <Card>
          <CardPanel>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardFrameHeader className="p-0">
                <CardFrameTitle>{t("skip_trial")}</CardFrameTitle>
                <CardFrameDescription>{t("skip_trial_description")}</CardFrameDescription>
              </CardFrameHeader>
              <AlertDialog open={showSkipTrialDialog} onOpenChange={setShowSkipTrialDialog}>
                <AlertDialogTrigger render={<Button variant="outline" />}>
                  {t("skip_trial")}
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("skip_trial_confirmation_title")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("skip_trial_confirmation_description")}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogClose render={<Button variant="ghost" />}>{t("cancel")}</AlertDialogClose>
                    <Button
                      variant="default"
                      onClick={handleSkipTrial}
                      loading={skipTrialMutation.isPending}>
                      {t("skip_trial")}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardPanel>
        </Card>
      )}
      <BillingCredits />
      {teamIdNumber && subscriptionStatus?.billingMode === "ACTIVE_USERS" && (
        <ActiveUserBreakdown teamId={teamIdNumber} />
      )}
      {teamIdNumber &&
        subscriptionStatus?.billingPeriod === "MONTHLY" &&
        subscriptionStatus?.highWaterMark !== null && (
          <HighWaterMarkBilling
            currentMembers={subscriptionStatus.currentMembers ?? 0}
            highWaterMark={subscriptionStatus.highWaterMark}
            paidSeats={subscriptionStatus.paidSeats ?? null}
            highWaterMarkPeriodStart={subscriptionStatus.highWaterMarkPeriodStart ?? null}
          />
        )}
      <InvoicesTable />
    </div>
  );
};

export default BillingView;
