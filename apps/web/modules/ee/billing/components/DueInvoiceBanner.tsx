"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { DunningStatus } from "@calcom/prisma/client";
import type { RouterOutputs } from "@calcom/trpc/react";
import { TopBanner } from "@calcom/ui/components/top-banner";

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

export function DueInvoiceBanner({ data }: DueInvoiceBannerProps) {
  const { t } = useLocale();

  if (!data || data.length === 0) return null;

  const sorted = [...data].sort((a, b) => (SEVERITY_ORDER[b.status] ?? 0) - (SEVERITY_ORDER[a.status] ?? 0));
  const displayRecord = sorted[0];

  const { variant, messageKey } = getBannerConfig(displayRecord);
  const billingFallback = displayRecord.isOrganization
    ? "/settings/organizations/billing"
    : `/settings/teams/${displayRecord.teamId}/billing`;
  const paymentUrl = displayRecord.invoiceUrl ?? billingFallback;

  return (
    <TopBanner
      variant={variant}
      text={t(messageKey, { teamName: displayRecord.teamName })}
      actions={
        <a
          href={paymentUrl}
          target={displayRecord.invoiceUrl ? "_blank" : undefined}
          rel={displayRecord.invoiceUrl ? "noopener noreferrer" : undefined}
          className="border-b border-b-black hover:opacity-80">
          {t("pay_now")}
        </a>
      }
    />
  );
}
