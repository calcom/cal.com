"use client";

import { format } from "date-fns";
import Link from "next/link";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";
import {
  Sheet,
  SheetContent,
  SheetBody,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@calcom/ui/components/sheet";
import { SkeletonText } from "@calcom/ui/components/skeleton";

import type { BlocklistEntry, BlocklistEntryDetails, BlocklistScope } from "../types";

export interface BlocklistEntryDetailsSheetProps<T extends BlocklistEntry> {
  scope: BlocklistScope;
  entry: T | null;
  isOpen: boolean;
  onClose: () => void;
  handleDeleteBlocklistEntry: (entry: T) => void;
  detailsData?: BlocklistEntryDetails;
  isLoading: boolean;
}

export function BlocklistEntryDetailsSheet<T extends BlocklistEntry>({
  scope,
  entry,
  isOpen,
  onClose,
  handleDeleteBlocklistEntry,
  detailsData,
  isLoading,
}: BlocklistEntryDetailsSheetProps<T>) {
  const { t } = useLocale();
  const isSystem = scope === "system";

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}>
      <SheetContent className="px-0 pb-0 sm:max-w-xl sm:px-0 sm:pb-0">
        <SheetHeader className="px-6">
          {isSystem ? (
            <div className="flex items-center gap-2">
              <SheetTitle>{entry?.value}</SheetTitle>
              <Badge variant="gray">{t("system_wide")}</Badge>
            </div>
          ) : (
            <SheetTitle>{entry?.value}</SheetTitle>
          )}
        </SheetHeader>

        <SheetBody className="px-6">
          {isLoading ? (
            <div className="mt-3 space-y-3">
              <SkeletonText className="h-6 w-32" />
              <SkeletonText className="h-40 w-full" />
            </div>
          ) : detailsData?.entry ? (
            <div className="mt-3 space-y-6">
              <div className="bg-subtle rounded-xl p-1">
                <h2 className="text-default p-5 text-sm font-semibold">{t("details")}</h2>

                <div className="bg-default space-y-3 rounded-xl p-5">
                  <div>
                    <label className="text-default block text-sm font-semibold">
                      {detailsData.entry.type === "EMAIL" ? t("email") : t("domain")}
                    </label>
                    <p className="text-subtle text-sm">{detailsData.entry.value}</p>
                  </div>

                  <div>
                    <label className="text-default block text-sm font-semibold">{t("type")}</label>
                    <p className="text-subtle text-sm">
                      {detailsData.entry.type === "EMAIL" ? t("email") : t("domain")}
                    </p>
                  </div>

                  {isSystem && (
                    <>
                      <div>
                        <label className="text-default block text-sm font-semibold">{t("scope")}</label>
                        <Badge variant="gray">{t("system_wide_all_organizations")}</Badge>
                      </div>

                      <div>
                        <label className="text-default block text-sm font-semibold">{t("source")}</label>
                        <p className="text-subtle text-sm">
                          {detailsData.entry.source === "MANUAL"
                            ? t("manual")
                            : detailsData.entry.source === "FREE_DOMAIN_POLICY"
                            ? t("free_domain_policy")
                            : t("automatic")}
                        </p>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="text-default block text-sm font-semibold">
                      {t(isSystem ? "blocked_by_system_admin" : "blocked_by")}
                    </label>
                    <p className="text-subtle text-sm">
                      {detailsData.auditHistory[0]?.changedByUser?.email || "—"}
                    </p>
                  </div>

                  <div>
                    <label className="text-default block text-sm font-semibold">{t("description")}</label>
                    <p className="text-subtle text-sm">
                      {detailsData.entry.description || t("no_description_provided")}
                    </p>
                  </div>

                  {detailsData.entry.bookingReports && detailsData.entry.bookingReports.length > 0 && (
                    <div>
                      <label className="text-default block text-sm font-semibold">
                        {t("related_booking")}
                      </label>

                      {detailsData.entry.bookingReports.map((report) => {
                        return (
                          <Link key={report.booking.uid} href={`/booking/${report.booking.uid}`}>
                            <div className="text-subtle flex items-center gap-1 text-sm">
                              {report.booking.title}
                              <Icon name="external-link" className="h-4 w-4" />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-subtle rounded-xl p-1">
                <h2 className="text-default p-5 text-sm font-semibold">{t("history")}</h2>
                {detailsData.auditHistory.length > 0 ? (
                  <div className="space-y-3">
                    {detailsData.auditHistory.map((audit) => (
                      <div key={audit.id} className="bg-default border-subtle rounded-xl border p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-default text-sm font-semibold">
                              {audit.changedByUser?.name || audit.changedByUser?.email || "—"}
                            </span>
                            <span className="text-subtle text-sm"> {t("added")}</span>
                            <div className="text-default mt-1 text-sm font-semibold">{audit.value}</div>
                          </div>
                          <span className="text-subtle text-sm">
                            {format(new Date(audit.changedAt), "MMM d, h:mm a")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-subtle text-sm">{t("no_audit_history")}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-muted mt-8 text-center">{t("blocklist_entry_not_found")}</div>
          )}
        </SheetBody>
        <SheetFooter className="bg-muted px-6 py-5">
          <Button
            type="button"
            color="secondary"
            onClick={() => entry && handleDeleteBlocklistEntry(entry)}
            disabled={!entry}>
            {t(isSystem ? "remove_from_system_blocklist" : "remove_from_blocklist")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
