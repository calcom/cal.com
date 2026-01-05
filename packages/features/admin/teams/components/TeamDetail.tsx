"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { PanelCard } from "@calcom/ui/components/card";
import { Icon } from "@calcom/ui/components/icon";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";
import { useState } from "react";

type TeamDetail = RouterOutputs["viewer"]["admin"]["teams"]["getById"];
type Invoice = RouterOutputs["viewer"]["admin"]["teams"]["stripe"]["getInvoices"]["invoices"][number];
type Payment = RouterOutputs["viewer"]["admin"]["teams"]["stripe"]["getPayments"]["payments"][number];

export const TeamDetail = ({ teamId }: { teamId: number }) => {
  const { t } = useLocale();
  const [invoicesLimit] = useState(10);
  const [paymentsLimit] = useState(10);

  // Fetch team details
  const { data: teamData, isLoading: isLoadingTeam } = trpc.viewer.admin.teams.getById.useQuery({
    teamId,
  });

  // Fetch Stripe data
  const { data: invoicesData, isLoading: isLoadingInvoices } =
    trpc.viewer.admin.teams.stripe.getInvoices.useQuery(
      {
        teamId,
        limit: invoicesLimit,
      },
      {
        enabled: !!teamData?.billing,
      }
    );

  const { data: paymentsData, isLoading: isLoadingPayments } =
    trpc.viewer.admin.teams.stripe.getPayments.useQuery(
      {
        teamId,
        limit: paymentsLimit,
      },
      {
        enabled: !!teamData?.billing,
      }
    );

  const { data: subscriptionData } = trpc.viewer.admin.teams.stripe.getSubscription.useQuery(
    {
      teamId,
    },
    {
      enabled: !!teamData?.billing,
    }
  );

  // Send invoice reminder mutation
  const sendReminderMutation = trpc.viewer.admin.teams.stripe.sendInvoiceReminder.useMutation({
    onSuccess: () => {
      showToast(t("invoice_reminder_sent"), "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  if (isLoadingTeam) {
    return (
      <SkeletonContainer>
        <div className="space-y-6">
          <SkeletonText className="h-32 w-full" />
          <SkeletonText className="h-48 w-full" />
          <SkeletonText className="h-48 w-full" />
        </div>
      </SkeletonContainer>
    );
  }

  if (!teamData) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted">{t("team_not_found")}</p>
      </div>
    );
  }

  const { team, billing, stats } = teamData;
  const invoices = invoicesData?.invoices ?? [];
  const payments = paymentsData?.payments ?? [];
  const subscription = subscriptionData?.subscription;

  const getStripeCustomerUrl = (customerId: string) => `https://dashboard.stripe.com/customers/${customerId}`;
  const getStripeSubscriptionUrl = (subscriptionId: string) =>
    `https://dashboard.stripe.com/subscriptions/${subscriptionId}`;
  const getStripeInvoiceUrl = (invoiceId: string) => `https://dashboard.stripe.com/invoices/${invoiceId}`;

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-muted text-sm">
        <a href="/settings/admin/teams" className="hover:text-emphasis">
          ← {t("back_to_teams")}
        </a>
      </div>

      {/* Basic Info */}
      <PanelCard title={t("basic_information")}>
        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
          <div>
            <label className="text-muted text-sm">{t("name")}</label>
            <div className="text-emphasis mt-1 font-medium">{team.name}</div>
          </div>
          <div>
            <label className="text-muted text-sm">{t("slug")}</label>
            <div className="text-emphasis mt-1 font-mono text-sm">/{team.slug}</div>
          </div>
          <div>
            <label className="text-muted text-sm">{t("type")}</label>
            <div className="mt-1">
              <Badge variant={team.isOrganization ? "blue" : "gray"}>
                {team.isOrganization ? t("organization") : t("team")}
              </Badge>
            </div>
          </div>
          <div>
            <label className="text-muted text-sm">{t("created")}</label>
            <div className="text-emphasis mt-1">{new Date(team.createdAt).toLocaleDateString()}</div>
          </div>
          {team.parent && (
            <div>
              <label className="text-muted text-sm">{t("parent_organization")}</label>
              <div className="text-emphasis mt-1">{team.parent.name}</div>
            </div>
          )}
          <div>
            <label className="text-muted text-sm">{t("members")}</label>
            <div className="text-emphasis mt-1 text-2xl font-bold">{stats.memberCount}</div>
          </div>
          <div>
            <label className="text-muted text-sm">{t("event_types")}</label>
            <div className="text-emphasis mt-1 text-2xl font-bold">{stats.eventTypeCount}</div>
          </div>
          <div>
            <label className="text-muted text-sm">{t("workflows")}</label>
            <div className="text-emphasis mt-1 text-2xl font-bold">{stats.workflowCount}</div>
          </div>
        </div>
      </PanelCard>

      {/* Stripe Billing */}
      {billing ? (
        <PanelCard title={t("stripe_billing")}>
          <div className="divide-subtle divide-y">
            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
              <div>
                <label className="text-muted text-sm">{t("subscription_status")}</label>
                <div className="mt-1">
                  <Badge
                    variant={
                      billing.status === "active" ? "green" : billing.status === "past_due" ? "red" : "gray"
                    }>
                    {billing.status}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-muted text-sm">{t("plan")}</label>
                <div className="text-emphasis mt-1 font-medium">{billing.planName}</div>
              </div>
              <div>
                <label className="text-muted text-sm">{t("customer_id")}</label>
                <div className="mt-1">
                  <a
                    href={getStripeCustomerUrl(billing.customerId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emphasis hover:underline flex items-center gap-1 font-mono text-sm">
                    {billing.customerId}
                    <Icon name="external-link" className="h-3 w-3" />
                  </a>
                </div>
              </div>
              <div>
                <label className="text-muted text-sm">{t("subscription_id")}</label>
                <div className="mt-1">
                  <a
                    href={getStripeSubscriptionUrl(billing.subscriptionId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emphasis hover:underline flex items-center gap-1 font-mono text-sm">
                    {billing.subscriptionId}
                    <Icon name="external-link" className="h-3 w-3" />
                  </a>
                </div>
              </div>
              {subscription && (
                <>
                  <div>
                    <label className="text-muted text-sm">{t("current_period")}</label>
                    <div className="text-emphasis mt-1 text-sm">
                      {formatDate(subscription.currentPeriodStart)} -{" "}
                      {formatDate(subscription.currentPeriodEnd)}
                    </div>
                  </div>
                  <div>
                    <label className="text-muted text-sm">{t("next_billing")}</label>
                    <div className="text-emphasis mt-1 font-medium">
                      {formatDate(subscription.currentPeriodEnd)}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2 p-4">
              <Button
                color="secondary"
                href={getStripeCustomerUrl(billing.customerId)}
                target="_blank"
                EndIcon="external-link">
                {t("view_in_stripe")}
              </Button>
            </div>
          </div>
        </PanelCard>
      ) : (
        <PanelCard title={t("stripe_billing")}>
          <div className="p-6">
            <p className="text-muted text-sm">{t("no_billing_info")}</p>
          </div>
        </PanelCard>
      )}

      {/* Invoice History */}
      {billing && (
        <PanelCard title={t("invoice_history")} collapsible defaultCollapsed={invoices.length === 0}>
          <div className="p-4">
            {isLoadingInvoices ? (
              <SkeletonText className="h-32 w-full" />
            ) : invoices.length === 0 ? (
              <p className="text-muted text-center text-sm">{t("no_invoices")}</p>
            ) : (
              <div className="border-subtle overflow-hidden rounded-lg border">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-emphasis px-4 py-3 text-left text-xs font-medium uppercase">
                        {t("invoice_number")}
                      </th>
                      <th className="text-emphasis px-4 py-3 text-left text-xs font-medium uppercase">
                        {t("date")}
                      </th>
                      <th className="text-emphasis px-4 py-3 text-left text-xs font-medium uppercase">
                        {t("amount")}
                      </th>
                      <th className="text-emphasis px-4 py-3 text-left text-xs font-medium uppercase">
                        {t("status")}
                      </th>
                      <th className="text-emphasis px-4 py-3 text-left text-xs font-medium uppercase">
                        {t("actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-default divide-subtle divide-y">
                    {invoices.map((invoice: Invoice) => (
                      <tr key={invoice.id} className="hover:bg-subtle">
                        <td className="px-4 py-3">
                          <a
                            href={invoice.hostedInvoiceUrl || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emphasis hover:underline font-mono text-sm">
                            {invoice.number || invoice.id}
                          </a>
                        </td>
                        <td className="text-emphasis px-4 py-3 text-sm">{formatDate(invoice.created)}</td>
                        <td className="text-emphasis px-4 py-3 font-medium">
                          {formatCurrency(invoice.amountDue, invoice.currency)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              invoice.status === "paid"
                                ? "green"
                                : invoice.status === "open"
                                  ? "yellow"
                                  : "red"
                            }>
                            {invoice.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {invoice.invoicePdf && (
                              <Button
                                color="minimal"
                                size="sm"
                                href={invoice.invoicePdf}
                                target="_blank"
                                StartIcon="file-text">
                                PDF
                              </Button>
                            )}
                            {invoice.status === "open" && (
                              <Button
                                color="secondary"
                                size="sm"
                                onClick={() =>
                                  sendReminderMutation.mutate({
                                    teamId,
                                    invoiceId: invoice.id,
                                  })
                                }
                                loading={sendReminderMutation.isLoading}
                                StartIcon="mail">
                                {t("send_reminder")}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </PanelCard>
      )}

      {/* Payment History */}
      {billing && (
        <PanelCard title={t("payment_history")} collapsible defaultCollapsed={payments.length === 0}>
          <div className="p-4">
            {isLoadingPayments ? (
              <SkeletonText className="h-32 w-full" />
            ) : payments.length === 0 ? (
              <p className="text-muted text-center text-sm">{t("no_payments")}</p>
            ) : (
              <div className="border-subtle overflow-hidden rounded-lg border">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-emphasis px-4 py-3 text-left text-xs font-medium uppercase">
                        {t("date")}
                      </th>
                      <th className="text-emphasis px-4 py-3 text-left text-xs font-medium uppercase">
                        {t("amount")}
                      </th>
                      <th className="text-emphasis px-4 py-3 text-left text-xs font-medium uppercase">
                        {t("status")}
                      </th>
                      <th className="text-emphasis px-4 py-3 text-left text-xs font-medium uppercase">
                        {t("payment_method")}
                      </th>
                      <th className="text-emphasis px-4 py-3 text-left text-xs font-medium uppercase">
                        {t("failure_reason")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-default divide-subtle divide-y">
                    {payments.map((payment: Payment) => (
                      <tr key={payment.id} className="hover:bg-subtle">
                        <td className="text-emphasis px-4 py-3 text-sm">{formatDate(payment.created)}</td>
                        <td className="text-emphasis px-4 py-3 font-medium">
                          {formatCurrency(payment.amount, payment.currency)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              payment.status === "succeeded"
                                ? "green"
                                : payment.status === "processing"
                                  ? "yellow"
                                  : "red"
                            }>
                            {payment.status}
                          </Badge>
                        </td>
                        <td className="text-emphasis px-4 py-3 text-sm">{payment.paymentMethod || "-"}</td>
                        <td className="px-4 py-3">
                          {payment.lastPaymentError ? (
                            <span className="text-sm text-red-600">{payment.lastPaymentError.message}</span>
                          ) : (
                            <span className="text-muted text-sm">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </PanelCard>
      )}

      {/* Team Members - Placeholder */}
      <PanelCard title={t("team_members")} collapsible defaultCollapsed>
        <div className="p-6">
          <p className="text-muted text-sm">
            {stats.memberCount} {t("members")} - {t("detailed_view_coming_soon")}
          </p>
        </div>
      </PanelCard>

      {/* Event Types - Placeholder */}
      <PanelCard title={t("event_types_overview")} collapsible defaultCollapsed>
        <div className="p-6">
          <p className="text-muted text-sm">
            {stats.eventTypeCount} {t("event_types")} - {t("detailed_view_coming_soon")}
          </p>
        </div>
      </PanelCard>
    </div>
  );
};
