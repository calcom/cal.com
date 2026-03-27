import { Button } from "@calid/features/ui/components/button";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Check } from "lucide-react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { TimeFormat } from "@calcom/lib/timeFormat";

interface ScheduleMeetingModalConfirmStepProps {
  selectedEventTitle?: string;
  selectedLocation?: string | null;
  selectedDate?: Date;
  selectedSlotTime: string | null;
  selectedDuration: number;
  isRecurringEventType: boolean;
  recurringPatternText: string | null;
  recurringEventCountText: string | number;
  contactName?: string;
  additionalGuests: string;
  bookingErrorMessage: string | null;
  isSubmitting: boolean;
  isConfirmDisabled: boolean;
  timeFormat: TimeFormat.TWELVE_HOUR | TimeFormat.TWENTY_FOUR_HOUR;
  onBack: () => void;
  onConfirm: () => void;
}

export const ScheduleMeetingModalConfirmStep = ({
  selectedEventTitle,
  selectedLocation,
  selectedDate,
  selectedSlotTime,
  selectedDuration,
  isRecurringEventType,
  recurringPatternText,
  recurringEventCountText,
  contactName,
  additionalGuests,
  bookingErrorMessage,
  isSubmitting,
  isConfirmDisabled,
  timeFormat,
  onBack,
  onConfirm,
}: ScheduleMeetingModalConfirmStepProps) => {
  const { t } = useLocale();

  return (
    <div className="space-y-4 pt-2">
      <div className="border-border space-y-3 rounded-lg border p-4">
        <h4 className="text-sm font-semibold">{t("contacts_booking_summary")}</h4>
        <dl className="space-y-2 text-sm">
          <SummaryRow label={t("contacts_event")} value={selectedEventTitle} />
          <SummaryRow label={t("date")} value={selectedDate ? format(selectedDate, "PPP") : ""} />
          <SummaryRow
            label={t("select_time")}
            value={selectedSlotTime ? format(parseISO(selectedSlotTime), timeFormat) : ""}
          />
          <SummaryRow
            label={t("duration")}
            value={t("contacts_duration_in_min", { duration: selectedDuration })}
          />
          {selectedLocation ? <SummaryRow label={t("location")} value={selectedLocation} /> : null}
          {isRecurringEventType ? (
            <>
              <SummaryRow
                label={t("contacts_recurrence")}
                value={recurringPatternText || t("contacts_recurring")}
                valueClassName="capitalize"
              />
              <SummaryRow label={t("contacts_occurrences")} value={String(recurringEventCountText)} />
            </>
          ) : null}
          <SummaryRow label={t("contacts_contact")} value={contactName} />
          {additionalGuests ? <SummaryRow label={t("contacts_guests")} value={additionalGuests} /> : null}
        </dl>
      </div>

      {bookingErrorMessage ? <p className="text-xs text-red-600">{bookingErrorMessage}</p> : null}

      {/* Stack buttons on mobile, row on sm+ */}
      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-between sm:gap-0">
        <Button color="secondary" onClick={onBack}>
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> {t("back")}
        </Button>
        <Button loading={isSubmitting} disabled={isConfirmDisabled} onClick={onConfirm}>
          <Check className="mr-1 h-3.5 w-3.5" /> {t("contacts_confirm_booking")}
        </Button>
      </div>
    </div>
  );
};

// Small helper to keep summary rows DRY and handle text wrapping gracefully
const SummaryRow = ({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value?: string;
  valueClassName?: string;
}) => (
  <div className="flex min-w-0 items-start justify-between gap-3">
    <dt className="text-muted-foreground shrink-0">{label}</dt>
    <dd className={`break-words text-right text-xs font-medium ${valueClassName ?? ""}`}>{value}</dd>
  </div>
);
