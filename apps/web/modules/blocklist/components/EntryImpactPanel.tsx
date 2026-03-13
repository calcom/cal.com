"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { WatchlistType } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { Badge } from "@calcom/ui/components/badge";
import { SkeletonText } from "@calcom/ui/components/skeleton";

export interface EntryImpactData {
  totalBookings: number;
  recentBookings: number;
  distinctHostCount: number;
  affectedOrgCount: number;
  reportCount: number;
  reportsByReason: { spam: number; dontKnowPerson: number; other: number };
  existingOrgBlockCount: number;
  statusBreakdown: { accepted: number; cancelled: number; rejected: number; pending: number; awaitingHost: number };
  topAffectedOrgs: Array<{ id: number; name: string; bookingCount: number; reportCount: number }>;
}

export function useEntryImpact(params: { type: WatchlistType; value: string }) {
  const query = trpc.viewer.admin.watchlist.getEntryImpact.useQuery(
    { type: params.type, value: params.value },
    { refetchOnWindowFocus: false }
  );
  return { ...query, data: query.data as EntryImpactData | null | undefined };
}

export function EntryImpactPanel({
  impact,
  isLoading,
}: {
  impact: EntryImpactData | null | undefined;
  isLoading: boolean;
}) {
  const { t } = useLocale();

  const hasBookingsInOrgs = impact ? impact.totalBookings > 0 && impact.affectedOrgCount > 0 : false;
  const totalReported = impact
    ? impact.reportsByReason.spam + impact.reportsByReason.dontKnowPerson + impact.reportsByReason.other
    : 0;
  const hasNoSpamSignals = impact ? totalReported === 0 && impact.existingOrgBlockCount === 0 : false;
  const isDangerous = hasBookingsInOrgs && hasNoSpamSignals;

  return (
    <div className="space-y-4">
      {!isLoading && impact && isDangerous ? (
        <Alert
          severity="error"
          CustomIcon="triangle-alert"
          customIconColor="text-semantic-error"
          title={t("no_spam_signals_warning_title")}
          message={t("no_spam_signals_warning_description", { orgCount: impact.affectedOrgCount })}
        />
      ) : (
        <Alert
          severity="warning"
          title={t("system_wide_blocklist_warning")}
          message={t("review_impact_before_adding")}
        />
      )}

      {isLoading ? (
        <ImpactSkeleton />
      ) : impact ? (
        <ImpactDetails impact={impact} />
      ) : (
        <p className="text-subtle text-sm">{t("no_impact_data_available")}</p>
      )}
    </div>
  );
}

function ImpactDetails({ impact }: { impact: EntryImpactData }) {
  const { t } = useLocale();
  const totalReported =
    impact.reportsByReason.spam + impact.reportsByReason.dontKnowPerson + impact.reportsByReason.other;
  const cancelledRate =
    impact.totalBookings > 0
      ? Math.round(
          ((impact.statusBreakdown.cancelled + impact.statusBreakdown.rejected) / impact.totalBookings) * 100
        )
      : 0;

  return (
    <div className="space-y-4">
      {impact.topAffectedOrgs.length > 0 && (
        <div>
          <h4 className="text-emphasis mb-2 text-sm font-semibold">{t("top_affected_organizations")}</h4>
          <div className="border-subtle divide-subtle divide-y rounded-md border">
            <div className="text-subtle grid grid-cols-3 gap-2 px-3 py-2 text-xs font-medium">
              <span>{t("organization")}</span>
              <span className="text-right">{t("bookings")}</span>
              <span className="text-right">{t("reports")}</span>
            </div>
            {impact.topAffectedOrgs.map((org) => (
              <div key={org.id} className="grid grid-cols-3 gap-2 px-3 py-2 text-sm">
                <span className="text-emphasis truncate font-medium">{org.name}</span>
                <span className="text-subtle text-right">{org.bookingCount}</span>
                <span className="text-subtle text-right">{org.reportCount}</span>
              </div>
            ))}
          </div>
          {impact.affectedOrgCount > impact.topAffectedOrgs.length && (
            <p className="text-subtle mt-1 text-xs">
              {t("and_count_more_organizations", {
                count: impact.affectedOrgCount - impact.topAffectedOrgs.length,
              })}
            </p>
          )}
        </div>
      )}

      <div>
        <h4 className="text-emphasis mb-2 text-sm font-semibold">{t("booking_activity_last_30_days")}</h4>
        <div className="border-subtle grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-gray-200 dark:bg-gray-700">
          <StatCell label={t("total_bookings")} value={impact.totalBookings} />
          <StatCell label={t("last_7_days")} value={impact.recentBookings} />
          <StatCell label={t("distinct_hosts")} value={impact.distinctHostCount} />
          <StatCell
            label={t("cancelled_or_rejected")}
            value={cancelledRate > 0 ? `${cancelledRate}%` : "0%"}
          />
        </div>
      </div>

      {(totalReported > 0 || impact.existingOrgBlockCount > 0) && (
        <div>
          <h4 className="text-emphasis mb-2 text-sm font-semibold">{t("existing_signals")}</h4>
          <div className="space-y-1.5">
            {totalReported > 0 && (
              <div className="text-subtle flex items-center gap-2 text-sm">
                <span>{t("booking_reports_filed", { count: totalReported })}</span>
                <div className="flex gap-1">
                  {impact.reportsByReason.spam > 0 && (
                    <Badge variant="red">{t("spam_count", { count: impact.reportsByReason.spam })}</Badge>
                  )}
                  {impact.reportsByReason.dontKnowPerson > 0 && (
                    <Badge variant="orange">
                      {t("dont_know_person_count", { count: impact.reportsByReason.dontKnowPerson })}
                    </Badge>
                  )}
                </div>
              </div>
            )}
            {impact.existingOrgBlockCount > 0 && (
              <p className="text-subtle text-sm">
                {t("orgs_already_blocked_this", { count: impact.existingOrgBlockCount })}
              </p>
            )}
          </div>
        </div>
      )}

      {impact.totalBookings === 0 && totalReported === 0 && impact.existingOrgBlockCount === 0 && (
        <p className="text-subtle text-sm">{t("no_matching_activity_last_30_days")}</p>
      )}
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-default px-3 py-2">
      <p className="text-subtle text-xs">{label}</p>
      <p className="text-emphasis text-lg font-semibold">{String(value)}</p>
    </div>
  );
}

function ImpactSkeleton() {
  return (
    <div className="space-y-4">
      <div>
        <SkeletonText className="mb-2 h-4 w-40" />
        <div className="border-subtle space-y-2 rounded-md border p-3">
          <SkeletonText className="h-4 w-full" />
          <SkeletonText className="h-4 w-3/4" />
          <SkeletonText className="h-4 w-1/2" />
        </div>
      </div>
      <div>
        <SkeletonText className="mb-2 h-4 w-48" />
        <div className="grid grid-cols-2 gap-2">
          <SkeletonText className="h-14 w-full" />
          <SkeletonText className="h-14 w-full" />
          <SkeletonText className="h-14 w-full" />
          <SkeletonText className="h-14 w-full" />
        </div>
      </div>
    </div>
  );
}
