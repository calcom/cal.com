"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { PanelCard } from "@calcom/ui/components/card";
import { TextField } from "@calcom/ui/components/form";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@calcom/ui/components/sheet";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";
import { useState } from "react";

import { BillingDetailsSection } from "./BillingDetailsSection";
import { DetailRow } from "./DetailRow";
import { TransferBillingForm } from "./TransferBillingForm";
import { dunningBadgeVariant } from "./billingUtils";

interface CustomerLookupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
}

function CustomerLookupSheet({ open, onOpenChange, customerId }: CustomerLookupSheetProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const { data, isPending, error } = trpc.viewer.admin.lookupBillingCustomer.useQuery(
    { customerId },
    { enabled: open && !!customerId }
  );

  const refreshDunningMutation = trpc.viewer.admin.refreshDunning.useMutation({
    onSuccess: (result) => {
      showToast(result.message, "success");
      utils.viewer.admin.lookupBillingCustomer.invalidate({ customerId });
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  const handleClose = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="bg-cal-muted">
        <SheetHeader>
          <SheetTitle>{t("customer_lookup_title")}</SheetTitle>
          <SheetDescription>{customerId}</SheetDescription>
        </SheetHeader>
        <SheetBody>
          {isPending ? (
            <SkeletonContainer>
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <SkeletonText key={i} className="h-8 w-full" />
                ))}
              </div>
            </SkeletonContainer>
          ) : error ? (
            <p className="text-error text-sm">{error.message}</p>
          ) : data ? (
            <div className="space-y-6">
              <section>
                <h3 className="text-emphasis mb-3 text-sm font-semibold">
                  {t("billing")} ({data.results.length})
                </h3>
                {data.results.length === 0 ? (
                  <p className="text-subtle text-sm">{t("customer_lookup_no_results")}</p>
                ) : (
                  <div className="space-y-3">
                    {data.results.map((billing) => (
                      <div key={billing.billingId} className="bg-default border-subtle rounded-lg border p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-emphasis text-sm font-semibold">
                              {billing.teamName ?? `Team #${billing.teamId}`}
                            </span>
                            <Badge variant={billing.isOrganization ? "blue" : "gray"}>
                              {billing.isOrganization ? t("organization") : t("team")}
                            </Badge>
                          </div>
                          <Badge variant={dunningBadgeVariant(billing.dunningStatus)}>
                            {billing.dunningStatus.replace(/_/g, " ")}
                          </Badge>
                        </div>

                        <div className="space-y-1">
                          <DetailRow label={t("plan")} value={billing.planName} />
                          <DetailRow label={t("status")} value={billing.subscriptionStatus} />
                          <DetailRow label={t("customer_id")} value={billing.customerId} />
                          <DetailRow label={t("subscription_id")} value={billing.subscriptionId} />
                          {billing.teamSlug && <DetailRow label={t("slug")} value={billing.teamSlug} />}
                        </div>

                        <BillingDetailsSection billing={billing} t={t} />

                        {billing.dunningStatus !== "CURRENT" && (
                          <div className="border-subtle mt-3 border-t pt-3">
                            <h4 className="text-emphasis mb-2 text-xs font-semibold">
                              {t("dunning_details")}
                            </h4>
                            <p className="text-subtle mb-3 text-xs italic">{billing.dunningExplanation}</p>
                            <div className="space-y-1">
                              {billing.dunningFirstFailedAt && (
                                <DetailRow
                                  label={t("first_failed")}
                                  value={new Date(billing.dunningFirstFailedAt).toLocaleDateString()}
                                />
                              )}
                              {billing.dunningLastFailedAt && (
                                <DetailRow
                                  label={t("last_failed")}
                                  value={new Date(billing.dunningLastFailedAt).toLocaleDateString()}
                                />
                              )}
                              {billing.dunningFailureReason && (
                                <DetailRow label={t("reason")} value={billing.dunningFailureReason} />
                              )}
                              <DetailRow
                                label={t("notifications_sent")}
                                value={String(billing.dunningNotificationsSent)}
                              />
                            </div>
                            <div className="mt-3 flex gap-2">
                              <Button
                                color="secondary"
                                size="sm"
                                loading={
                                  refreshDunningMutation.isPending &&
                                  refreshDunningMutation.variables?.billingId === billing.billingId
                                }
                                onClick={() => {
                                  refreshDunningMutation.mutate({
                                    billingId: billing.billingId,
                                    entityType: billing.entityType,
                                  });
                                }}>
                                {t("refresh_dunning_status")}
                              </Button>
                              {billing.dunningInvoiceUrl && (
                                <a href={billing.dunningInvoiceUrl} target="_blank" rel="noopener noreferrer">
                                  <Button color="minimal" size="sm" type="button">
                                    {t("view_invoice")}
                                  </Button>
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="border-subtle mt-3 border-t pt-3">
                          <TransferBillingForm
                            billingId={billing.billingId}
                            entityType={billing.entityType}
                            onComplete={() => {
                              utils.viewer.admin.lookupBillingCustomer.invalidate({ customerId });
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </SheetBody>
        <SheetFooter>
          <Button color="minimal" onClick={handleClose}>
            {t("close")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function CustomerLookupSection() {
  const { t } = useLocale();
  const [searchInput, setSearchInput] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetCustomerId, setSheetCustomerId] = useState("");
  const [hasOpened, setHasOpened] = useState(false);

  const handleSearch = () => {
    const trimmed = searchInput.trim();
    if (!trimmed) return;
    setSheetCustomerId(trimmed);
    setSheetOpen(true);
    setHasOpened(true);
  };

  return (
    <PanelCard title={t("customer_lookup_title")} subtitle={t("customer_lookup_description")}>
      <div className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <TextField
            containerClassName="w-full"
            label={t("customer_id")}
            name="customerSearch"
            placeholder="cus_..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
          />
          <Button type="button" disabled={!searchInput.trim()} onClick={handleSearch}>
            {t("search")}
          </Button>
        </div>
      </div>
      {hasOpened && (
        <CustomerLookupSheet open={sheetOpen} onOpenChange={setSheetOpen} customerId={sheetCustomerId} />
      )}
    </PanelCard>
  );
}
