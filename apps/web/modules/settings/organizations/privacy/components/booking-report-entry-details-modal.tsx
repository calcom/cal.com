"use client";

import Link from "next/link";
import { Controller, useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WatchlistType } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { ToggleGroup } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

type BookingReport = RouterOutputs["viewer"]["organizations"]["listBookingReports"]["rows"][number];

interface BookingReportEntryDetailsModalProps {
  entry: BookingReport | null;
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  blockType: WatchlistType;
}

export function BookingReportEntryDetailsModal({
  entry,
  isOpen,
  onClose,
}: BookingReportEntryDetailsModalProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

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

  const addToWatchlist = trpc.viewer.organizations.addToWatchlist.useMutation({
    onSuccess: async () => {
      await utils.viewer.organizations.listBookingReports.invalidate();
      await utils.viewer.organizations.listWatchlistEntries.invalidate();
      showToast(t("blocklist_entry_created"), "success");
      onClose();
      reset();
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const dismissBookingReport = trpc.viewer.organizations.dismissBookingReport.useMutation({
    onSuccess: async () => {
      await utils.viewer.organizations.listBookingReports.invalidate();
      showToast(t("booking_report_dismissed"), "success");
      onClose();
      reset();
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const onSubmit = (data: FormData) => {
    if (!entry) return;

    addToWatchlist.mutate({
      reportIds: [entry.id],
      type: data.blockType,
    });
  };

  const handleDismiss = () => {
    if (!entry) return;

    dismissBookingReport.mutate({
      reportId: entry.id,
    });
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
          <div className="stack-y-5">
            <div className="bg-subtle rounded-xl p-1">
              <h2 className="text-emphasis px-5 py-4 text-base font-semibold">{t("details")}</h2>
              <div className="bg-default stack-y-4 rounded-xl p-5">
                <div>
                  <label className="text-emphasis mb-1 block text-sm font-semibold">{t("email")}</label>
                  <p className="text-subtle text-sm">{entry.bookerEmail}</p>
                </div>

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
                    {t("related_booking")}
                  </label>
                  <Link href={`/booking/${entry.booking.uid}`}>
                    <div className="text-subtle flex items-center gap-1 text-sm">
                      {entry.booking.title}
                      <Icon name="external-link" className="h-4 w-4" />
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-emphasis mb-2 text-base font-semibold">
                {t("what_would_you_like_to_block")}
              </h2>
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
                disabled={isSubmitting || addToWatchlist.isPending || dismissBookingReport.isPending}>
                {t("go_back")}
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  color="secondary"
                  onClick={handleDismiss}
                  loading={dismissBookingReport.isPending}
                  disabled={isSubmitting || addToWatchlist.isPending || dismissBookingReport.isPending}>
                  {t("dont_block")}
                </Button>
                <Button
                  type="submit"
                  loading={isSubmitting || addToWatchlist.isPending}
                  disabled={isSubmitting || addToWatchlist.isPending || dismissBookingReport.isPending}>
                  {t("add_to_blocklist")}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
