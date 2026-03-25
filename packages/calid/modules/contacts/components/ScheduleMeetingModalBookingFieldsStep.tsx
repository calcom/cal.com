import { Button } from "@calid/features/ui/components/button";
import { Label } from "@calid/features/ui/components/label";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

interface ScheduleMeetingModalBookingFieldsStepProps {
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  bookingErrorMessage: string | null;
  onBack: () => void;
  onNext: () => void;
  nextDisabled: boolean;
  children: ReactNode;
}

export const ScheduleMeetingModalBookingFieldsStep = ({
  isLoading,
  errorMessage,
  onRetry,
  bookingErrorMessage,
  onBack,
  onNext,
  nextDisabled,
  children,
}: ScheduleMeetingModalBookingFieldsStepProps) => {
  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <Label>Booking Fields</Label>
        <p className="text-muted-foreground text-xs">
          Fill in the event-specific booking details before continuing.
        </p>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground flex items-center gap-2 py-3 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading booking fields...
        </div>
      ) : null}

      {errorMessage ? (
        <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <p>{errorMessage || "Could not load booking fields."}</p>
          <Button color="secondary" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : null}

      {!isLoading && !errorMessage ? (
        <div className="max-h-[42vh] overflow-y-auto pr-1">{children}</div>
      ) : null}

      {bookingErrorMessage ? <p className="text-xs text-red-600">{bookingErrorMessage}</p> : null}

      <div className="flex justify-between pt-2">
        <Button color="secondary" onClick={onBack}>
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back
        </Button>
        <Button disabled={nextDisabled} onClick={onNext}>
          Next <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
