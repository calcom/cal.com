"use client";

import { format } from "date-fns";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetBody,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@calcom/ui/components/sheet";
import { SkeletonText } from "@calcom/ui/components/skeleton";

type BlocklistEntry = RouterOutputs["viewer"]["admin"]["watchlist"]["list"]["rows"][number];

interface BlocklistEntryDetailsSheetProps {
  entry: BlocklistEntry | null;
  isOpen: boolean;
  onClose: () => void;
  handleDeleteBlocklistEntry: (entry: BlocklistEntry) => void;
}

export function BlocklistEntryDetailsSheet({
  entry,
  isOpen,
  onClose,
  handleDeleteBlocklistEntry,
}: BlocklistEntryDetailsSheetProps) {
  const { t } = useLocale();

  const { data, isLoading } = trpc.viewer.admin.watchlist.getDetails.useQuery(
    { id: entry?.id ?? "" },
    {
      enabled: !!entry?.id && isOpen,
    }
  );

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}>
      <SheetContent className="px-0 pb-0 sm:max-w-xl sm:px-0 sm:pb-0">
        <SheetHeader className="px-6">
          <div className="flex items-center gap-2">
            <SheetTitle>{entry?.value}</SheetTitle>
            <Badge variant="gray">{t("system_wide")}</Badge>
          </div>
        </SheetHeader>

        <SheetBody className="px-6">
          {isLoading ? (
            <div className="mt-3 space-y-3">
              <SkeletonText className="h-6 w-32" />
              <SkeletonText className="h-40 w-full" />
            </div>
          ) : data?.entry ? (
            <div className="mt-3 space-y-6">
              <div className="bg-subtle rounded-xl p-1">
                <h2 className="text-default p-5 text-sm font-semibold">{t("details")}</h2>

                <div className="bg-default space-y-3 rounded-xl p-5">
                  <div>
                    <label className="text-default block text-sm font-semibold">
                      {data.entry.type === "EMAIL" ? t("email") : t("domain")}
                    </label>
                    <p className="text-subtle text-sm">{data.entry.value}</p>
                  </div>

                  <div>
                    <label className="text-default block text-sm font-semibold">{t("type")}</label>
                    <p className="text-subtle text-sm">
                      {data.entry.type === "EMAIL" ? t("email") : t("domain")}
                    </p>
                  </div>

                  <div>
                    <label className="text-default block text-sm font-semibold">{t("scope")}</label>
                    <Badge variant="gray">{t("system_wide_all_organizations")}</Badge>
                  </div>

                  <div>
                    <label className="text-default block text-sm font-semibold">{t("source")}</label>
                    <p className="text-subtle text-sm">
                      {data.entry.source === "MANUAL"
                        ? t("manual")
                        : data.entry.source === "FREE_DOMAIN_POLICY"
                          ? t("free_domain_policy")
                          : t("automatic")}
                    </p>
                  </div>

                  <div>
                    <label className="text-default block text-sm font-semibold">
                      {t("blocked_by_system_admin")}
                    </label>
                    <p className="text-subtle text-sm">{data.auditHistory[0]?.changedByUser?.email || "—"}</p>
                  </div>

                  <div>
                    <label className="text-default block text-sm font-semibold">{t("description")}</label>
                    <p className="text-subtle text-sm">
                      {data.entry.description || t("no_description_provided")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-subtle rounded-xl p-1">
                <h2 className="text-default p-5 text-sm font-semibold">{t("history")}</h2>
                {data.auditHistory.length > 0 ? (
                  <div className="space-y-3">
                    {data.auditHistory.map((audit) => (
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
            {t("remove_from_system_blocklist")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
