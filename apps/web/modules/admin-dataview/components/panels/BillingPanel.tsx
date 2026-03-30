"use client";

import { Badge } from "@calcom/ui/components/badge";
import { ExternalLinkIcon } from "@coss/ui/icons";

interface BillingData {
  hasBilling: boolean;
  entityType: string;
  billing: {
    id: string;
    customerId: string;
    subscriptionId: string;
    status: string;
    planName: string;
    billingPeriod: string | null;
    billingMode: string;
    pricePerSeat: number | null;
    paidSeats: number | null;
    minSeats: number | null;
    highWaterMark: number | null;
    subscriptionStart: string | null;
    subscriptionTrialEnd: string | null;
    subscriptionEnd: string | null;
    createdAt: string;
    updatedAt: string;
    dunning: {
      status: string;
      firstFailedAt: string | null;
      lastFailedAt: string | null;
      failureReason: string | null;
      invoiceUrl: string | null;
      notificationsSent: number;
    } | null;
  } | null;
  seatChanges: {
    id: string;
    changeType: string;
    seatCount: number;
    userId: number | null;
    changeDate: string;
    monthKey: string;
  }[];
}

const STATUS_VARIANTS: Record<string, "green" | "red" | "orange" | "gray" | "blue"> = {
  active: "green",
  trialing: "blue",
  past_due: "orange",
  canceled: "red",
  unpaid: "red",
  incomplete: "orange",
  CURRENT: "green",
  WARNING: "orange",
  SOFT_BLOCKED: "orange",
  HARD_BLOCKED: "red",
  CANCELLED: "red",
};

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { dateStyle: "medium" });
}

function formatCents(cents: number | null): string {
  if (cents === null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

export function BillingPanel({ data }: { data: BillingData }) {
  if (!data.hasBilling || !data.billing) {
    return (
      <div className="text-muted py-4 text-center text-xs italic">
        No billing record found for this team
      </div>
    );
  }

  const b = data.billing;
  const dunning = b.dunning;

  return (
    <div className="space-y-3">
      {/* Subscription overview */}
      <div className="divide-subtle divide-y rounded-md border border-subtle">
        <Row label="Plan">
          <div className="flex items-center gap-2">
            <span className="font-medium">{b.planName}</span>
            <Badge variant={STATUS_VARIANTS[b.status] ?? "gray"} size="sm">{b.status}</Badge>
            <Badge variant="gray" size="sm">{data.entityType}</Badge>
          </div>
        </Row>
        <Row label="Stripe Customer">
          <span className="font-mono text-[11px]">{b.customerId}</span>
        </Row>
        <Row label="Subscription">
          <span className="font-mono text-[11px]">{b.subscriptionId}</span>
        </Row>
        <Row label="Period">
          {b.billingPeriod ?? "—"}
        </Row>
        <Row label="Billing Mode">
          {b.billingMode}
        </Row>
        <Row label="Price / Seat">
          {formatCents(b.pricePerSeat)}
        </Row>
        <Row label="Seats">
          <div className="flex items-center gap-2">
            <span>{b.paidSeats ?? "—"} paid</span>
            {b.minSeats != null && <span className="text-muted">({b.minSeats} min)</span>}
            {b.highWaterMark != null && <span className="text-muted">HWM: {b.highWaterMark}</span>}
          </div>
        </Row>
        <Row label="Sub Start">{formatDate(b.subscriptionStart)}</Row>
        {b.subscriptionTrialEnd && <Row label="Trial End">{formatDate(b.subscriptionTrialEnd)}</Row>}
        {b.subscriptionEnd && <Row label="Sub End">{formatDate(b.subscriptionEnd)}</Row>}
      </div>

      {/* Dunning status */}
      {dunning && (
        <div className="rounded-md border border-subtle">
          <div className="flex items-center gap-2 px-3 py-2 text-xs">
            <span className="font-medium">Dunning</span>
            <Badge variant={STATUS_VARIANTS[dunning.status] ?? "gray"} size="sm">{dunning.status}</Badge>
          </div>
          {dunning.status !== "CURRENT" && (
            <div className="divide-subtle divide-y border-t border-subtle">
              {dunning.firstFailedAt && <Row label="First Failed">{formatDate(dunning.firstFailedAt)}</Row>}
              {dunning.lastFailedAt && <Row label="Last Failed">{formatDate(dunning.lastFailedAt)}</Row>}
              {dunning.failureReason && <Row label="Reason">{dunning.failureReason}</Row>}
              <Row label="Notifications Sent">{dunning.notificationsSent}</Row>
              {dunning.invoiceUrl && (
                <Row label="Invoice">
                  <a
                    href={dunning.invoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400">
                    View Invoice
                    <ExternalLinkIcon className="h-2.5 w-2.5" />
                  </a>
                </Row>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recent seat changes */}
      {data.seatChanges.length > 0 && (
        <div className="overflow-hidden rounded-md border border-subtle">
          <div className="flex items-center gap-2 px-3 py-2 text-xs">
            <span className="font-medium">Recent Seat Changes</span>
            <Badge variant="gray" size="sm">{data.seatChanges.length}</Badge>
          </div>
          <div className="no-scrollbar max-h-40 overflow-auto border-t border-subtle">
            <table className="min-w-full text-[11px]">
              <thead>
                <tr className="bg-subtle/50">
                  <th className="px-2 py-1 text-left text-subtle font-medium">Type</th>
                  <th className="px-2 py-1 text-left text-subtle font-medium">Seats</th>
                  <th className="px-2 py-1 text-left text-subtle font-medium">User</th>
                  <th className="px-2 py-1 text-left text-subtle font-medium">Date</th>
                  <th className="px-2 py-1 text-left text-subtle font-medium">Month</th>
                </tr>
              </thead>
              <tbody>
                {data.seatChanges.map((sc) => (
                  <tr key={sc.id} className="border-t border-subtle">
                    <td className="px-2 py-1">
                      <Badge variant={sc.changeType === "ADDITION" ? "green" : "red"} size="sm">
                        {sc.changeType === "ADDITION" ? "+" : "−"}{sc.seatCount}
                      </Badge>
                    </td>
                    <td className="px-2 py-1">{sc.seatCount}</td>
                    <td className="px-2 py-1 text-muted">{sc.userId ?? "—"}</td>
                    <td className="px-2 py-1">{formatDate(sc.changeDate)}</td>
                    <td className="px-2 py-1 font-mono">{sc.monthKey}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-3 py-1.5 text-xs">
      <span className="w-28 shrink-0 text-subtle font-medium">{label}</span>
      <div className="min-w-0 flex-1 text-default">{children}</div>
    </div>
  );
}
