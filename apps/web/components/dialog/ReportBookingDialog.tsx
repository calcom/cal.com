import type { Dispatch, SetStateAction } from "react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { ReportReason } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { Checkbox } from "@calcom/ui/components/form";
import { Select, Label } from "@calcom/ui/components/form";
import { TextArea } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

interface IReportBookingDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  bookingId: number;
  isRecurring: boolean;
}

interface FormValues {
  reason: ReportReason;
  description: string;
  cancelBooking: boolean;
  allRemainingBookings: boolean;
}

export const ReportBookingDialog = (props: IReportBookingDialog) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const { isOpenDialog, setIsOpenDialog, bookingId, isRecurring } = props;

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      reason: ReportReason.SPAM,
      description: "",
      cancelBooking: false,
      allRemainingBookings: false,
    },
  });

  const cancelBooking = watch("cancelBooking");

  useEffect(() => {
    if (!cancelBooking) {
      setValue("allRemainingBookings", false);
    }
  }, [cancelBooking, setValue]);

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
      bookingId,
      reason: data.reason,
      description: data.description || undefined,
      cancelBooking: data.cancelBooking,
      allRemainingBookings: data.allRemainingBookings,
    });
  };

  const reasonOptions = [
    { label: t("report_reason_spam"), value: ReportReason.SPAM },
    { label: t("report_reason_dont_know_person"), value: ReportReason.DONT_KNOW_PERSON },
    { label: t("report_reason_other"), value: ReportReason.OTHER },
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

              <div className="mb-4">
                <Controller
                  name="cancelBooking"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center">
                      <Checkbox
                        id="cancelBooking"
                        checked={field.value}
                        className="mb-2"
                        onCheckedChange={field.onChange}
                      />
                      <Label htmlFor="cancelBooking" className="text-emphasis ml-2 text-sm">
                        {t("cancel_booking_when_reporting")}
                      </Label>
                    </div>
                  )}
                />
              </div>

              {isRecurring && cancelBooking && (
                <div className="mb-4">
                  <Controller
                    name="allRemainingBookings"
                    control={control}
                    render={({ field }) => (
                      <div className="flex items-center">
                        <Checkbox
                          id="allRemainingBookings"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <Label htmlFor="allRemainingBookings" className="text-emphasis ml-2 text-sm">
                          {t("report_all_remaining_bookings")}
                        </Label>
                      </div>
                    )}
                  />
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
