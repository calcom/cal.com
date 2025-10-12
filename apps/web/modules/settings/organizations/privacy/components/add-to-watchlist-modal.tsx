"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WatchlistType, WatchlistAction } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogHeader, DialogFooter } from "@calcom/ui/components/dialog";
import { Form, Label, Select, TextAreaField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

type BookingReport = RouterOutputs["viewer"]["organizations"]["listBookingReports"]["rows"][number];

interface AddToWatchlistModalProps {
  open: boolean;
  onClose: () => void;
  report?: BookingReport;
  reports?: BookingReport[];
}

const formSchema = z.object({
  type: z.nativeEnum(WatchlistType),
  action: z.nativeEnum(WatchlistAction),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function AddToWatchlistModal({ open, onClose, report, reports }: AddToWatchlistModalProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: WatchlistType.EMAIL,
      action: WatchlistAction.REPORT,
      description: "",
    },
  });

  const isBulk = !!reports && reports.length > 0;
  const firstReport = isBulk ? reports[0] : report;

  if (!firstReport) {
    return null;
  }

  const watchlistType = form.watch("type");
  const actionType = form.watch("action");

  const addToWatchlistMutation = trpc.viewer.organizations.addToWatchlist.useMutation({
    onSuccess: () => {
      showToast(t("successfully_added_to_watchlist"), "success");
      utils.viewer.organizations.listBookingReports.invalidate();
      onClose();
      form.reset();
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const onSubmit = (data: FormValues) => {
    const reportIds = isBulk ? reports.map((r) => r.id) : [firstReport.id];

    addToWatchlistMutation.mutate({
      reportIds,
      type: data.type,
      action: data.action,
      description: data.description,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent enableOverflow>
        <DialogHeader
          title={t("add_to_watchlist")}
          subtitle={
            isBulk
              ? t("add_multiple_to_watchlist_subtitle", { count: reports.length })
              : t("add_to_watchlist_subtitle", { email: firstReport.bookerEmail })
          }
        />

        <Form form={form} handleSubmit={onSubmit}>
          <div className="space-y-4">
            <div>
              <Label>{t("what_to_add")}</Label>
              <Select
                options={[
                  {
                    label: t("this_email_address"),
                    value: WatchlistType.EMAIL,
                    description: firstReport.bookerEmail,
                  },
                  {
                    label: t("entire_domain"),
                    value: WatchlistType.DOMAIN,
                    description: `${t("all_emails_from")} @${firstReport.bookerEmail.split("@")[1]}`,
                  },
                ]}
                value={
                  watchlistType === WatchlistType.EMAIL
                    ? {
                        label: t("this_email_address"),
                        value: WatchlistType.EMAIL,
                        description: firstReport.bookerEmail,
                      }
                    : {
                        label: t("entire_domain"),
                        value: WatchlistType.DOMAIN,
                        description: `${t("all_emails_from")} @${firstReport.bookerEmail.split("@")[1]}`,
                      }
                }
                onChange={(option) => {
                  if (option && "value" in option) {
                    form.setValue("type", option.value as WatchlistType);
                  }
                }}
              />
            </div>

            <div>
              <Label>{t("what_should_happen")}</Label>
              <Select
                options={[
                  {
                    label: t("flag_future_bookings"),
                    value: WatchlistAction.REPORT,
                    description: t("flag_future_bookings_description"),
                  },
                  {
                    label: t("block_all_bookings"),
                    value: WatchlistAction.BLOCK,
                    description: t("block_all_bookings_description"),
                  },
                  {
                    label: t("notify_admins"),
                    value: WatchlistAction.ALERT,
                    description: t("notify_admins_description"),
                  },
                ]}
                value={
                  actionType === WatchlistAction.REPORT
                    ? {
                        label: t("flag_future_bookings"),
                        value: WatchlistAction.REPORT,
                        description: t("flag_future_bookings_description"),
                      }
                    : actionType === WatchlistAction.BLOCK
                    ? {
                        label: t("block_all_bookings"),
                        value: WatchlistAction.BLOCK,
                        description: t("block_all_bookings_description"),
                      }
                    : {
                        label: t("notify_admins"),
                        value: WatchlistAction.ALERT,
                        description: t("notify_admins_description"),
                      }
                }
                onChange={(option) => {
                  if (option && "value" in option) {
                    form.setValue("action", option.value as WatchlistAction);
                  }
                }}
              />
            </div>

            <div>
              <TextAreaField
                {...form.register("description")}
                placeholder={t("add_internal_note_placeholder")}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" color="minimal" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" loading={addToWatchlistMutation.isPending}>
              {t("add_to_watchlist")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
