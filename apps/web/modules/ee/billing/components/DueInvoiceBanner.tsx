"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { TopBanner } from "@calcom/ui/components/top-banner";

export type DueInvoiceBannerProps = {
  data: RouterOutputs["viewer"]["me"]["getUserTopBanners"]["dueInvoiceBanner"];
};

export function DueInvoiceBanner({ data }: DueInvoiceBannerProps) {
  const { t } = useLocale();

  if (!data || data.length === 0) return null;

  // Get the first proration to display (prioritize blocking ones)
  const blockingProrations = data.filter((d) => d.isBlocking);
  const displayProration = blockingProrations[0] ?? data[0];
  const hasBlocking = blockingProrations.length > 0;

  // Use Stripe invoice URL if available, otherwise fall back to billing settings
  const paymentUrl = displayProration.invoiceUrl ?? `/settings/teams/${displayProration.teamId}/billing`;

  return (
    <TopBanner
      variant={hasBlocking ? "error" : "warning"}
      text={t(hasBlocking ? "invoice_overdue_blocking" : "invoice_due", {
        teamName: displayProration.teamName,
      })}
      actions={
        <a
          href={paymentUrl}
          target={displayProration.invoiceUrl ? "_blank" : undefined}
          rel={displayProration.invoiceUrl ? "noopener noreferrer" : undefined}
          className="border-b border-b-black hover:opacity-80">
          {t("pay_now")}
        </a>
      }
    />
  );
}
