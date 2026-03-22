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
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Event</span>
            <span className="font-medium">{selectedEventTitle}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date</span>
            <span className="font-medium">{selectedDate ? format(selectedDate, "PPP") : ""}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Time</span>
            <span className="font-medium">
              {selectedSlotTime ? format(parseISO(selectedSlotTime), timeFormat) : ""}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Duration</span>
            <span className="font-medium">{selectedDuration} min</span>
          </div>
          {selectedLocation ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location</span>
              <span className="text-right  font-medium">{selectedLocation}</span>
            </div>
          ) : null}
          {isRecurringEventType ? (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recurrence</span>
                <span className="text-right text-xs font-medium capitalize">
                  {recurringPatternText || "Recurring"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Occurrences</span>
                <span className="font-medium">{recurringEventCountText}</span>
              </div>
            </>
          ) : null}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Contact</span>
            <span className="font-medium">{contactName}</span>
          </div>
          {additionalGuests ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Guests</span>
              <span className="text-right text-xs font-medium">{additionalGuests}</span>
            </div>
          ) : null}
        </div>
      </div>
      {bookingErrorMessage ? <p className="text-xs text-red-600">{bookingErrorMessage}</p> : null}
      <div className="flex justify-between">
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
