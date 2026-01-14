"use client";

import { useState } from "react";

import { IS_CALCOM } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { PanelCard } from "@calcom/ui/components/card";
import { TextField } from "@calcom/ui/components/form";
import { SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp * 1000));
}

function getStatusVariant(status: string | null): "success" | "warning" | "error" | "default" {
  switch (status) {
    case "paid":
      return "success";
    case "open":
      return "warning";
    case "void":
    case "uncollectible":
      return "error";
    default:
      return "default";
  }
}

export default function LicenseView() {
  const { t } = useLocale();
  const [billingEmail, setBillingEmail] = useState("");

  const resendEmailMutation = trpc.viewer.admin.resendPurchaseCompleteEmail.useMutation({
    onSuccess: () => {
      showToast(t("admin_license_resend_success"), "success");
    },
    onError: (error) => {
      showToast(error.message || t("admin_license_resend_error"), "error");
    },
  });

  const billingPortalMutation = trpc.viewer.admin.billingPortalLink.useMutation({
    onSuccess: (data) => {
      if (!data?.url) {
        showToast(t("admin_license_portal_missing_url"), "error");
        return;
      }

      window.open(data.url, "_blank", "noopener,noreferrer");
    },
    onError: (error) => {
      showToast(error.message || t("admin_license_portal_error"), "error");
    },
  });

  const invoicesQuery = trpc.viewer.admin.invoices.useQuery({});

  const showResendSection = IS_CALCOM;

  return (
    <div className="flex flex-col gap-4">
      {showResendSection && (
        <PanelCard title={t("admin_license_resend_title")} subtitle={t("admin_license_resend_description")}>
          <div className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <TextField
                containerClassName="w-full"
                label={t("admin_license_billing_email_label")}
                name="billingEmail"
                type="email"
                placeholder={t("admin_license_billing_email_placeholder")}
                value={billingEmail}
                onChange={(event) => setBillingEmail(event.target.value)}
              />
              <Button
                type="button"
                loading={resendEmailMutation.isPending}
                disabled={!billingEmail.trim()}
                onClick={() => {
                  resendEmailMutation.mutate({
                    billingEmail: billingEmail.trim(),
                  });
                }}>
                {t("admin_license_resend_button")}
              </Button>
            </div>
          </div>
        </PanelCard>
      )}

      <PanelCard title={t("admin_license_portal_title")} subtitle={t("admin_license_portal_description")}>
        <div className="p-4">
          <Button
            type="button"
            loading={billingPortalMutation.isPending}
            onClick={() => billingPortalMutation.mutate({})}>
            {t("admin_license_portal_button")}
          </Button>
        </div>
      </PanelCard>

      <PanelCard title={t("admin_invoices_title")} subtitle={t("admin_invoices_description")}>
        <div className="divide-subtle divide-y">
          {invoicesQuery.isLoading && (
            <div className="p-4">
              <SkeletonText className="h-4 w-full" />
              <SkeletonText className="mt-2 h-4 w-3/4" />
              <SkeletonText className="mt-2 h-4 w-1/2" />
            </div>
          )}
          {invoicesQuery.isError && (
            <div className="text-subtle p-4 text-sm">{t("admin_invoices_error")}</div>
          )}
          {invoicesQuery.data?.invoices.length === 0 && (
            <div className="text-subtle p-4 text-sm">{t("admin_invoices_empty")}</div>
          )}
          {invoicesQuery.data?.invoices.map((invoice) => (
            <div key={invoice.id} className="flex items-center justify-between gap-4 p-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-emphasis text-sm font-medium">
                    {invoice.number || invoice.id}
                  </span>
                  <Badge variant={getStatusVariant(invoice.status)}>
                    {invoice.status || t("unknown")}
                  </Badge>
                </div>
                <span className="text-subtle text-xs">
                  {formatDate(invoice.created)} &middot; {formatCurrency(invoice.amount_due, invoice.currency)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {invoice.hosted_invoice_url && (
                  <Button
                    color="secondary"
                    size="sm"
                    href={invoice.hosted_invoice_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    EndIcon="external-link">
                    {t("view")}
                  </Button>
                )}
                {invoice.invoice_pdf && (
                  <Button
                    color="minimal"
                    size="sm"
                    href={invoice.invoice_pdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    EndIcon="download">
                    {t("download")}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </PanelCard>
    </div>
  );
}
