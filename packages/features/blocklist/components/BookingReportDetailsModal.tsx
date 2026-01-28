"use client";

import Link from "next/link";
import { Controller, useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WatchlistType } from "@calcom/prisma/enums";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { ToggleGroup } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

import type { GroupedBookingReport, BlocklistScope } from "../types";

interface FormData {
  blockType: WatchlistType;
}

export interface BookingReportDetailsModalProps<T extends GroupedBookingReport> {
  scope: BlocklistScope;
  entry: T | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToBlocklist: (email: string, type: WatchlistType) => void;
  onDismiss: (email: string) => void;
  isAddingToBlocklist?: boolean;
  isDismissing?: boolean;
}

export function BookingReportDetailsModal<T extends GroupedBookingReport>({
  scope,
  entry,
  isOpen,
  onClose,
  onAddToBlocklist,
  onDismiss,
  isAddingToBlocklist = false,
  isDismissing = false,
}: BookingReportDetailsModalProps<T>) {
  const { t } = useLocale();
  const isSystem = scope === "system";

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      blockType: WatchlistType.EMAIL,
    },
  });

  const onSubmit = (data: FormData) => {
    if (!entry) return;
    onAddToBlocklist(entry.bookerEmail, data.blockType);
  };

  const handleDismiss = () => {
    if (!entry) return;
    onDismiss(entry.bookerEmail);
  };

  const handleGoBack = () => {
    onClose();
    reset();
  };

  const reasonMap: Record<string, string> = {
    SPAM: t("spam"),
    DONT_KNOW_PERSON: t("dont_know_person"),
    OTHER: t("other"),
  };

  if (!entry) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent enableOverflow>
        <DialogHeader title={t("review_report") + ` - ${entry.bookerEmail}`} />
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-5">
            <div className="bg-subtle rounded-xl p-1">
              <h2 className="text-emphasis px-5 py-4 text-base font-semibold">{t("details")}</h2>
              <div className="bg-default space-y-4 rounded-xl p-5">
                <div>
                  <label className="text-emphasis mb-1 block text-sm font-semibold">{t("email")}</label>
                  <p className="text-subtle text-sm">{entry.bookerEmail}</p>
                </div>

                {isSystem && entry.organization && (
                  <div>
                    <label className="text-emphasis mb-1 block text-sm font-semibold">
                      {t("organization")}
                    </label>
                    <p className="text-subtle text-sm">{entry.organization.name}</p>
                  </div>
                )}

                {isSystem && !entry.organization && (
                  <div>
                    <label className="text-emphasis mb-1 block text-sm font-semibold">
                      {t("organization")}
                    </label>
                    <p className="text-subtle text-sm">{t("individual")}</p>
                  </div>
                )}

                <div>
                  <label className="text-emphasis mb-1 block text-sm font-semibold">{t("reason")}</label>
                  <p className="text-subtle text-sm">{reasonMap[entry.reason] || entry.reason}</p>
                </div>

                <div>
                  <label className="text-emphasis mb-1 block text-sm font-semibold">{t("reported_by")}</label>
                  <p className="text-subtle text-sm">{entry.reporter?.email || "—"}</p>
                </div>

                <div>
                  <label className="text-emphasis mb-1 block text-sm font-semibold">{t("description")}</label>
                  <p className="text-subtle text-sm">{entry.description || t("no_description_provided")}</p>
                </div>

                <div>
                  <label className="text-emphasis mb-1 block text-sm font-semibold">
                    {t("related_bookings")} ({entry.reports.length})
                  </label>
                  <div className="max-h-32 space-y-1 overflow-y-auto">
                    {entry.reports.map((report) => (
                      <Link key={report.id} href={`/booking/${report.booking.uid}`}>
                        <div className="text-subtle hover:text-emphasis flex items-center gap-1 text-sm">
                          {report.booking.title || t("untitled")}
                          <Icon name="external-link" className="h-3 w-3" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-emphasis mb-2 text-base font-semibold">
                {t("what_would_you_like_to_block")}
              </h2>
              {isSystem && <p className="text-subtle mb-3 text-sm">{t("system_wide_blocklist_warning")}</p>}
              <Controller
                name="blockType"
                control={control}
                render={({ field }) => (
                  <ToggleGroup
                    value={field.value}
                    onValueChange={(value) => {
                      if (value) field.onChange(value);
                    }}
                    options={[
                      {
                        value: WatchlistType.EMAIL,
                        label: t("block_this_email"),
                        iconLeft: <Icon name="mail" className="h-4 w-4" />,
                      },
                      {
                        value: WatchlistType.DOMAIN,
                        label: t("block_all_from_domain"),
                        iconLeft: <Icon name="globe" className="h-4 w-4" />,
                      },
                    ]}
                  />
                )}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <div className="flex w-full items-center justify-between">
              <Button
                type="button"
                color="minimal"
                onClick={handleGoBack}
                disabled={isSubmitting || isAddingToBlocklist || isDismissing}>
                {t("go_back")}
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  color="secondary"
                  onClick={handleDismiss}
                  loading={isDismissing}
                  disabled={isSubmitting || isAddingToBlocklist || isDismissing}>
                  {t("dont_block")}
                </Button>
                <Button
                  type="submit"
                  loading={isSubmitting || isAddingToBlocklist}
                  disabled={isSubmitting || isAddingToBlocklist || isDismissing}>
                  {t(isSystem ? "add_to_system_blocklist" : "add_to_blocklist")}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
