"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WatchlistType, WatchlistAction } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogHeader, DialogFooter } from "@calcom/ui/components/dialog";
import { Form, Label, TextField, Select, TextAreaField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

type BookingReport = RouterOutputs["viewer"]["organizations"]["listBookingReports"]["rows"][number];

interface AddToWatchlistModalProps {
  open: boolean;
  onClose: () => void;
  report: BookingReport;
}

const formSchema = z.object({
  type: z.nativeEnum(WatchlistType),
  value: z.string().min(1, "Value is required"),
  action: z.nativeEnum(WatchlistAction),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function AddToWatchlistModal({ open, onClose, report }: AddToWatchlistModalProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: WatchlistType.EMAIL,
      value: report.bookerEmail,
      action: WatchlistAction.REPORT,
      description: "",
    },
  });

  const watchlistType = form.watch("type");

  useMemo(() => {
    if (watchlistType === WatchlistType.EMAIL) {
      form.setValue("value", report.bookerEmail);
    } else if (watchlistType === WatchlistType.DOMAIN) {
      const domain = report.bookerEmail.split("@")[1];
      form.setValue("value", domain || "");
    }
  }, [watchlistType, report.bookerEmail, form]);

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
    addToWatchlistMutation.mutate({
      reportId: report.id,
      type: data.type,
      value: data.value,
      action: data.action,
      description: data.description,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent enableOverflow>
        <DialogHeader title={t("add_to_watchlist")} subtitle={t("add_booker_to_organization_watchlist")} />

        <Form form={form} handleSubmit={onSubmit}>
          <div className="space-y-4">
            <div>
              <Label>{t("watchlist_type")}</Label>
              <Select
                options={[
                  { label: t("email"), value: WatchlistType.EMAIL },
                  { label: t("domain"), value: WatchlistType.DOMAIN },
                ]}
                {...form.register("type")}
              />
            </div>

            <TextField {...form.register("value")} placeholder={t("enter_value")} />

            <div>
              <Label>{t("action")}</Label>
              <Select
                options={[
                  {
                    label: t("report_action"),
                    value: WatchlistAction.REPORT,
                    description: t("auto_report_future_bookings"),
                  },
                  {
                    label: t("block_action"),
                    value: WatchlistAction.BLOCK,
                    description: t("block_from_making_bookings"),
                  },
                  {
                    label: t("alert_action"),
                    value: WatchlistAction.ALERT,
                    description: t("alert_admins_on_booking_attempts"),
                  },
                ]}
                {...form.register("action")}
              />
            </div>

            <TextAreaField {...form.register("description")} placeholder={t("add_optional_notes")} rows={3} />
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
