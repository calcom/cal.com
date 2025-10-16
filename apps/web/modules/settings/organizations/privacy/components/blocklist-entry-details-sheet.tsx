"use client";

import { format } from "date-fns";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@calcom/ui/components/sheet";
import { SkeletonText } from "@calcom/ui/components/skeleton";

type BlocklistEntry = RouterOutputs["viewer"]["organizations"]["listWatchlistEntries"]["rows"][number];

interface BlocklistEntryDetailsSheetProps {
  entry: BlocklistEntry | null;
  isOpen: boolean;
  onClose: () => void;
}

export function BlocklistEntryDetailsSheet({ entry, isOpen, onClose }: BlocklistEntryDetailsSheetProps) {
  const { t } = useLocale();

  const { data, isLoading } = trpc.viewer.organizations.getWatchlistEntryDetails.useQuery(
    { id: entry?.id ?? "" },
    {
      enabled: !!entry?.id && isOpen,
    }
  );

  const getActionVariant = (action: string) => {
    switch (action) {
      case "BLOCK":
        return "red";
      case "REPORT":
        return "orange";
      case "ALERT":
        return "blue";
      default:
        return "gray";
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("blocklist_entry_details")}</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="mt-6 space-y-4">
            <SkeletonText className="h-6 w-32" />
            <SkeletonText className="h-10 w-full" />
            <SkeletonText className="h-6 w-32" />
            <SkeletonText className="h-10 w-full" />
            <SkeletonText className="h-6 w-32" />
            <SkeletonText className="h-20 w-full" />
          </div>
        ) : data?.entry ? (
          <div className="mt-6">
            <div className="space-y-4">
              <div>
                <label className="text-default mb-1 block text-sm font-medium">{t("type")}</label>
                <Badge variant="blue" size="lg">
                  {data.entry.type === "EMAIL" ? t("email") : t("domain")}
                </Badge>
              </div>

              <div>
                <label className="text-default mb-1 block text-sm font-medium">{t("value")}</label>
                <p className="text-emphasis text-base">{data.entry.value}</p>
              </div>

              <div>
                <label className="text-default mb-1 block text-sm font-medium">{t("action")}</label>
                <Badge variant={getActionVariant(data.entry.action)} size="lg">
                  {t(data.entry.action.toLowerCase())}
                </Badge>
              </div>

              <div>
                <label className="text-default mb-1 block text-sm font-medium">{t("description")}</label>
                <p className="text-default">{data.entry.description || t("no_description_provided")}</p>
              </div>

              <div>
                <label className="text-default mb-1 block text-sm font-medium">{t("created_by")}</label>
                <p className="text-default">{data.auditHistory[0]?.changedByUser?.email || "—"}</p>
              </div>
            </div>

            <div className="border-subtle my-6 border-t" />

            <div>
              <h3 className="text-emphasis mb-4 font-semibold">{t("audit_history")}</h3>
              {data.auditHistory.length > 0 ? (
                <div className="space-y-0">
                  {data.auditHistory.map((audit, index) => (
                    <div
                      key={audit.id}
                      className={`py-3 ${
                        index !== data.auditHistory.length - 1 ? "border-subtle border-b" : ""
                      }`}>
                      <div className="mb-1 flex items-start justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted text-xs">{t("by")}:</span>
                          <span className="text-default text-sm">{audit.changedByUser?.email || "—"}</span>
                        </div>
                        <span className="text-muted text-xs">
                          {format(new Date(audit.changedAt), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted text-xs">{t("added")}:</span>
                        <span className="text-emphasis text-sm">{audit.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted text-sm">{t("no_audit_history")}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-muted mt-8 text-center">{t("blocklist_entry_not_found")}</div>
        )}
      </SheetContent>
    </Sheet>
  );
}
