"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { DunningStatus } from "@calcom/prisma/client";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";
import { TopBanner } from "@calcom/ui/components/top-banner";
import { Spinner } from "@calcom/ui/components/icon";

export type DueInvoiceBannerProps = {
  data: RouterOutputs["viewer"]["me"]["getUserTopBanners"]["dueInvoiceBanner"];
};

type BannerRecord = DueInvoiceBannerProps["data"][number];

const SEVERITY_ORDER: Partial<Record<DunningStatus, number>> = {
  CANCELLED: 4,
  HARD_BLOCKED: 3,
  SOFT_BLOCKED: 2,
  WARNING: 1,
};

function getBannerConfig(record: BannerRecord) {
  if (record.isEnterprise) {
    return { variant: "warning" as const, messageKey: "dunning_enterprise_banner" };
  }

  switch (record.status) {
    case "CANCELLED":
      return { variant: "error" as const, messageKey: "dunning_cancelled_banner" };
    case "SOFT_BLOCKED":
      return { variant: "error" as const, messageKey: "dunning_soft_blocked_banner" };
    case "HARD_BLOCKED":
      return { variant: "error" as const, messageKey: "dunning_hard_blocked_banner" };
    case "WARNING":
    default:
      return { variant: "warning" as const, messageKey: "dunning_warning_banner" };
  }
}

function ResubscribeAction({ record }: { record: BannerRecord }) {
  const { t } = useLocale();
  const resubscribeMutation = trpc.viewer.teams.resubscribe.useMutation({
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  return (
    <button
      onClick={() => resubscribeMutation.mutate({ teamId: record.teamId })}
      disabled={resubscribeMutation.isPending}
      className="border-b border-b-black hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed">
      {resubscribeMutation.isPending ? <Spinner className="inline h-4 w-4 animate-spin" /> : t("resubscribe")}
    </button>
  );
}

export function DueInvoiceBanner({ data }: DueInvoiceBannerProps) {
  const { t } = useLocale();

  if (!data || data.length === 0) return null;

  const sorted = [...data].sort(
    (a, b) =>
      (SEVERITY_ORDER[b.status as DunningStatus] ?? 0) - (SEVERITY_ORDER[a.status as DunningStatus] ?? 0)
  );
  const displayRecord = sorted[0];

  const { variant, messageKey } = getBannerConfig(displayRecord);
  const needsResubscribe =
    !displayRecord.invoiceUrl && displayRecord.status === "CANCELLED" && !displayRecord.isEnterprise;
  const billingFallback = displayRecord.isOrganization
    ? "/settings/organizations/billing"
    : `/settings/teams/${displayRecord.teamId}/billing`;
  const paymentUrl = displayRecord.invoiceUrl ?? billingFallback;

  return (
    <TopBanner
      variant={variant}
      text={t(messageKey, { teamName: displayRecord.teamName })}
      actions={
        needsResubscribe ? (
          <ResubscribeAction record={displayRecord} />
        ) : (
          <a
            href={paymentUrl}
            target={displayRecord.invoiceUrl ? "_blank" : undefined}
            rel={displayRecord.invoiceUrl ? "noopener noreferrer" : undefined}
            className="border-b border-b-black hover:opacity-80">
            {t("pay_now")}
          </a>
        )
      }
    />
  );
}
