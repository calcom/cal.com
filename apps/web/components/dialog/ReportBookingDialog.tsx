import dayjs from "@calcom/dayjs";
import { Dialog } from "@calcom/features/components/controlled-dialog";
import { formatTime } from "@calcom/lib/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { BookingReportReason } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { Label, Select, TextArea } from "@calcom/ui/components/form";
import { RadioField, RadioGroup } from "@calcom/ui/components/radio";
import { showToast } from "@calcom/ui/components/toast";
import type { Dispatch, SetStateAction } from "react";
import { Controller, useForm } from "react-hook-form";

function ReportTypeSelector({
  reportType,
  onReportTypeChange,
  isFreeDomain,
  isSeatedEvent,
  bookerEmail,
  bookerDomain,
  matchingBookings,
  isPreviewLoading,
  userTimeZone,
  userTimeFormat,
}: {
  reportType: "EMAIL" | "DOMAIN";
  onReportTypeChange: (value: "EMAIL" | "DOMAIN") => void;
  isFreeDomain: boolean;
  isSeatedEvent: boolean;
  bookerEmail: string;
  bookerDomain: string;
  matchingBookings: { uid: string; title: string; startTime: Date; endTime: Date; attendeeEmail: string }[];
  isPreviewLoading: boolean;
  userTimeZone: string | undefined;
  userTimeFormat: number | null;
}) {
  const {
    t,
    i18n: { language },
  } = useLocale();

  return (
    <>
      {!isFreeDomain && !isSeatedEvent && bookerDomain && (
        <div className="mb-4">
          <RadioGroup
            value={reportType}
            onValueChange={(value) => onReportTypeChange(value as "EMAIL" | "DOMAIN")}>
            <RadioField id="report-email" value="EMAIL" label={t("report_type_email")} />
            <RadioField
              id="report-domain"
              value="DOMAIN"
              label={t("report_type_domain", { domain: bookerDomain })}
            />
          </RadioGroup>
        </div>
      )}

      {matchingBookings.length > 0 && (
        <div className="mb-4">
          <Alert
            severity="warning"
            title={
              reportType === "EMAIL"
                ? t("report_email_bookings_preview", { email: bookerEmail })
                : t("report_domain_bookings_preview", { domain: bookerDomain })
            }
          />
          <ul className="border-subtle mt-2 max-h-40 overflow-y-auto rounded-md border">
            {matchingBookings.map((b) => (
              <li
                key={b.uid}
                className="border-subtle flex items-center justify-between border-b px-3 py-2 text-sm last:border-b-0">
                <span className="text-emphasis font-medium">{b.title}</span>
                <span className="text-subtle text-xs">
                  {dayjs(b.startTime).tz(userTimeZone).locale(language).format("ddd, D MMM") +
                    " " +
                    formatTime(b.startTime, userTimeFormat, userTimeZone)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {matchingBookings.length === 0 && !isPreviewLoading && (
        <div className="mb-4">
          <Alert severity="warning" title={t("report_booking_will_cancel_description")} />
        </div>
      )}
    </>
  );
}

type BookingReportStatus = "upcoming" | "past" | "cancelled" | "rejected";

interface IReportBookingDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  bookingUid: string;
  bookerEmail: string;
  isRecurring: boolean;
  isSeatedEvent: boolean;
  status: BookingReportStatus;
}

interface FormValues {
  reason: BookingReportReason;
  description: string;
  reportType: "EMAIL" | "DOMAIN";
}

export const ReportBookingDialog = (props: IReportBookingDialog) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const { data: me } = useMeQuery();
  const userTimeZone = me?.timeZone;
  const userTimeFormat = me?.timeFormat ?? null;
  const { isOpenDialog, setIsOpenDialog, bookingUid, bookerEmail, isSeatedEvent } = props;

  const bookerDomain = bookerEmail.split("@")[1]?.toLowerCase() ?? "";

  const { data: freeDomainCheck } = trpc.viewer.bookings.isFreeDomain.useQuery(
    { email: bookerEmail },
    { enabled: isOpenDialog && !!bookerDomain }
  );
  const isFreeDomain = freeDomainCheck?.isFreeDomain ?? false;

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      reason: BookingReportReason.SPAM,
      description: "",
      reportType: "EMAIL",
    },
  });

  const reportType = watch("reportType");

  const { data: bookingPreview, isLoading: isPreviewLoading } =
    trpc.viewer.bookings.getUpcomingBookingsByDomain.useQuery(
      { bookingUid, reportType },
      { enabled: isOpenDialog }
    );

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
      reportType: data.reportType,
    });
  };

  const reasonOptions = [
    { label: t("report_reason_spam"), value: BookingReportReason.SPAM },
    {
      label: t("report_reason_dont_know_person"),
      value: BookingReportReason.DONT_KNOW_PERSON,
    },
    { label: t("report_reason_other"), value: BookingReportReason.OTHER },
  ];

  const matchingBookings = bookingPreview?.bookings ?? [];

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

              <ReportTypeSelector
                reportType={reportType}
                onReportTypeChange={(value) => setValue("reportType", value)}
                isFreeDomain={isFreeDomain}
                isSeatedEvent={isSeatedEvent}
                bookerEmail={bookerEmail}
                bookerDomain={bookerDomain}
                matchingBookings={matchingBookings}
                isPreviewLoading={isPreviewLoading}
                userTimeZone={userTimeZone}
                userTimeFormat={userTimeFormat}
              />
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
            <Button
              type="submit"
              color="primary"
              disabled={isPending || isPreviewLoading}
              loading={isPending || isPreviewLoading}>
              {t("submit_report")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
