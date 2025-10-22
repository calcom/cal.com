"use client";

import type { RouterOutputs } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { PanelCard } from "@calcom/ui/components/card";
import { SkeletonText } from "@calcom/ui/components/skeleton";

type BillingData = RouterOutputs["viewer"]["adminTeams"]["getBilling"];

export const AdminPaymentHistory = ({
  billingData,
  isLoading,
  entityType = "team",
}: {
  billingData: BillingData | undefined;
  isLoading: boolean;
  entityType?: "team" | "organization";
}) => {
  if (isLoading) {
    return (
      <PanelCard title="Payment History">
        <div className="space-y-3 p-4">
          <SkeletonText className="h-4 w-full" />
          <SkeletonText className="h-4 w-full" />
          <SkeletonText className="h-4 w-full" />
        </div>
      </PanelCard>
    );
  }

  if (!billingData?.invoices || billingData.invoices.length === 0) {
    return (
      <PanelCard title="Payment History">
        <div className="text-subtle p-4 text-sm">No payment history available for this {entityType}.</div>
      </PanelCard>
    );
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "green";
      case "open":
        return "blue";
      case "draft":
        return "gray";
      case "uncollectible":
      case "void":
        return "red";
      default:
        return "gray";
    }
  };

  return (
    <PanelCard title="Payment History" subtitle={`${billingData.invoices.length} recent invoices`}>
      <div className="divide-subtle divide-y">
        {billingData.invoices.map((invoice) => (
          <div key={invoice.id} className="hover:bg-subtle p-4 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-emphasis text-sm font-medium">{invoice.number || invoice.id}</span>
                  <Badge variant={getStatusColor(invoice.status || "draft")}>{invoice.status}</Badge>
                </div>
                <div className="text-subtle text-xs">
                  {new Date(invoice.created * 1000).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-emphasis text-sm font-semibold">
                    {formatCurrency(invoice.amountDue, invoice.currency)}
                  </div>
                  {invoice.amountPaid > 0 && invoice.amountPaid !== invoice.amountDue && (
                    <div className="text-subtle text-xs">
                      Paid: {formatCurrency(invoice.amountPaid, invoice.currency)}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {invoice.hostedInvoiceUrl && (
                    <Button
                      color="minimal"
                      size="sm"
                      StartIcon="external-link"
                      href={invoice.hostedInvoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer">
                      View
                    </Button>
                  )}
                  {invoice.invoicePdf && (
                    <Button
                      color="minimal"
                      size="sm"
                      StartIcon="download"
                      href={invoice.invoicePdf}
                      target="_blank"
                      rel="noopener noreferrer">
                      PDF
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </PanelCard>
  );
};
