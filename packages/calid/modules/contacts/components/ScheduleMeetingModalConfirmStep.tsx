import { Button } from "@calid/features/ui/components/button";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Check } from "lucide-react";

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
  return (
    <div className="space-y-4 pt-2">
      <div className="border-border space-y-3 rounded-lg border p-4">
        <h4 className="text-sm font-semibold">Booking Summary</h4>
        <dl className="space-y-2 text-sm">
          <SummaryRow label="Event" value={selectedEventTitle} />
          <SummaryRow label="Date" value={selectedDate ? format(selectedDate, "PPP") : ""} />
          <SummaryRow
            label="Time"
            value={selectedSlotTime ? format(parseISO(selectedSlotTime), timeFormat) : ""}
          />
          <SummaryRow label="Duration" value={`${selectedDuration} min`} />
          {selectedLocation ? <SummaryRow label="Location" value={selectedLocation} /> : null}
          {isRecurringEventType ? (
            <>
              <SummaryRow
                label="Recurrence"
                value={recurringPatternText || "Recurring"}
                valueClassName="capitalize"
              />
              <SummaryRow label="Occurrences" value={String(recurringEventCountText)} />
            </>
          ) : null}
          <SummaryRow label="Contact" value={contactName} />
          {additionalGuests ? <SummaryRow label="Guests" value={additionalGuests} /> : null}
        </dl>
      </div>

      {bookingErrorMessage ? <p className="text-xs text-red-600">{bookingErrorMessage}</p> : null}

      {/* Stack buttons on mobile, row on sm+ */}
      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-between sm:gap-0">
        <Button color="secondary" onClick={onBack}>
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back
        </Button>
        <Button loading={isSubmitting} disabled={isConfirmDisabled} onClick={onConfirm}>
          <Check className="mr-1 h-3.5 w-3.5" /> Confirm Booking
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
    <dd className={`text-right text-xs font-medium break-words ${valueClassName ?? ""}`}>{value}</dd>
  </div>
);