import type { Dispatch, SetStateAction } from "react";
import { Controller, useForm } from "react-hook-form";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { BookingReportReason } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { Select, Label } from "@calcom/ui/components/form";
import { TextArea } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

type BookingReportStatus = "upcoming" | "past" | "cancelled" | "rejected";

interface IReportBookingDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  bookingUid: string;
  isRecurring: boolean;
  status: BookingReportStatus;
}

interface FormValues {
  reason: BookingReportReason;
  description: string;
}

export const ReportBookingDialog = (props: IReportBookingDialog) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const { isOpenDialog, setIsOpenDialog, bookingUid, status } = props;

  const willBeCancelled = status === "upcoming";

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      reason: BookingReportReason.SPAM,
      description: "",
    },
  });

  const { mutate: reportBooking, isPending } = trpc.viewer.bookings.reportBooking.useMutation({
    async onSuccess(data) {
      showToast(data.message, "success");
      setIsOpenDialog(false);
      await utils.viewer.bookings.invalidate();
    },
    onError(error) {
      showToast(error.message || t("unexpected_error_try_again"), "error");
    },
  });

  const onSubmit = (data: FormValues) => {
    reportBooking({
      bookingUid,
      reason: data.reason,
      description: data.description || undefined,
    });
  };

  const reasonOptions = [
    { label: t("report_reason_spam"), value: BookingReportReason.SPAM },
    { label: t("report_reason_dont_know_person"), value: BookingReportReason.DONT_KNOW_PERSON },
    { label: t("report_reason_other"), value: BookingReportReason.OTHER },
  ];

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent enableOverflow>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-row space-x-3">
            <div className="w-full">
              <DialogHeader title={t("report_booking")} subtitle={t("report_booking_description")} />
              <div className="mb-4">
                <Label htmlFor="reason" className="text-emphasis mb-2 block text-sm font-medium">
                  {t("reason")} <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="reason"
                  control={control}
                  rules={{ required: t("field_required") }}
                  render={({ field }) => (
                    <Select
                      {...field}
                      options={reasonOptions}
                      onChange={(option) => {
                        if (option) field.onChange(option.value);
                      }}
                      value={reasonOptions.find((opt) => opt.value === field.value)}
                    />
                  )}
                />
                {errors.reason && <p className="text-destructive mt-1 text-sm">{errors.reason.message}</p>}
              </div>

              <div className="mb-4">
                <Label htmlFor="description" className="text-emphasis mb-2 block text-sm font-medium">
                  {t("description")} <span className="text-subtle font-normal">({t("optional")})</span>
                </Label>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextArea {...field} placeholder={t("report_booking_description_placeholder")} rows={3} />
                  )}
                />
              </div>

              {willBeCancelled && (
                <div className="mb-4">
                  <Alert severity="warning" title={t("report_booking_will_cancel_description")} />
                </div>
              )}
            </div>
          </div>

          <DialogFooter showDivider className="mt-8">
            <Button
              type="button"
              color="secondary"
              onClick={() => setIsOpenDialog(false)}
              disabled={isPending}>
              {t("cancel")}
            </Button>
            <Button type="submit" color="primary" disabled={isPending} loading={isPending}>
              {t("submit_report")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
