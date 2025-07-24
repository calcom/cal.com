import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { ReportReason } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { Form, TextAreaField, CheckboxField, SelectField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

interface ReportBookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: number;
  bookingTitle: string;
  isUpcoming: boolean;
  isCancelled?: boolean;
  onSuccess?: () => void;
}

interface ReportFormData {
  reason: ReportReason;
  description?: string;
  cancelBooking: boolean;
}

const REPORT_REASON_OPTIONS = [
  { value: ReportReason.SPAM, label: "spam" },
  { value: ReportReason.DONT_KNOW_PERSON, label: "dont_know_person" },
  { value: ReportReason.OTHER, label: "other" },
];

export function ReportBookingDialog({
  isOpen,
  onClose,
  bookingId,
  bookingTitle: _bookingTitle,
  isUpcoming,
  isCancelled = false,
  onSuccess,
}: ReportBookingDialogProps) {
  const { t } = useLocale();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ReportFormData>({
    defaultValues: {
      reason: ReportReason.SPAM,
      description: "",
      cancelBooking: false,
    },
  });

  const reportBookingMutation = trpc.viewer.bookings.reportBooking.useMutation({
    onSuccess: (data) => {
      showToast(data.message, "success");
      onSuccess?.();
      onClose();
      form.reset();
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const onSubmit = (data: ReportFormData) => {
    setIsSubmitting(true);
    reportBookingMutation.mutate({
      bookingId,
      reason: data.reason,
      description: data.description || undefined,
      cancelBooking: data.cancelBooking,
    });
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      form.reset();
    }
  };

  const cancelBooking = form.watch("cancelBooking");

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" enableOverflow>
        <DialogHeader title={t("report_booking")} subtitle={t("report_booking_subtitle")} />

        <Form form={form} handleSubmit={onSubmit}>
          <div className="space-y-4">
            <Controller
              name="reason"
              control={form.control}
              rules={{ required: t("reason_required") }}
              render={({ field }) => (
                <SelectField
                  label={t("reason")}
                  placeholder={t("select_reason")}
                  options={REPORT_REASON_OPTIONS.map((option) => ({ ...option, label: t(option.label) }))}
                  value={REPORT_REASON_OPTIONS.map((option) => ({ ...option, label: t(option.label) })).find(
                    (option) => option.value === field.value
                  )}
                  onChange={(selectedOption) => {
                    if (selectedOption) {
                      field.onChange(selectedOption.value);
                    }
                  }}
                  required
                />
              )}
            />

            <TextAreaField
              label={t("additional_comments")}
              placeholder={t("additional_comments_placeholder")}
              {...form.register("description")}
              rows={3}
            />

            {isUpcoming && !isCancelled && (
              <div className="space-y-2">
                <CheckboxField
                  {...form.register("cancelBooking")}
                  description={t("cancel_booking_description")}
                  id="cancel-booking-checkbox"
                />
                <p className="text-subtle text-xs">{t("attendee_not_notified_report")}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" color="secondary" onClick={handleClose} disabled={isSubmitting}>
              {t("cancel")}
            </Button>
            <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
              {cancelBooking ? t("report_and_cancel") : t("report")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
