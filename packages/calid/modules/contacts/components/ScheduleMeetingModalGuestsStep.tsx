import { Button } from "@calid/features/ui/components/button";
import { Input } from "@calid/features/ui/components/input/input";
import { Label } from "@calid/features/ui/components/label";
import { ArrowLeft, ArrowRight, Users } from "lucide-react";

interface ScheduleMeetingModalGuestsStepProps {
  contactName?: string;
  contactEmail?: string;
  additionalGuests: string;
  onAdditionalGuestsChange: (value: string) => void;
  bookingErrorMessage: string | null;
  onBack: () => void;
  onNext: () => void;
}

export const ScheduleMeetingModalGuestsStep = ({
  contactName,
  contactEmail,
  additionalGuests,
  onAdditionalGuestsChange,
  bookingErrorMessage,
  onBack,
  onNext,
}: ScheduleMeetingModalGuestsStepProps) => {
  return (
    <div className="space-y-4 pt-2">
      <div className="bg-muted/50 border-border rounded-lg border p-3">
        <div className="text-sm font-medium">{contactName}</div>
        <div className="text-muted-foreground text-xs">{contactEmail}</div>
      </div>
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" /> Additional Guests
        </Label>
        <Input
          value={additionalGuests}
          onChange={(event) => onAdditionalGuestsChange(event.target.value)}
          placeholder="guest1@email.com, guest2@email.com"
        />
        <p className="text-muted-foreground text-xs">Separate multiple emails with commas</p>
      </div>
      {bookingErrorMessage ? <p className="text-xs text-red-600">{bookingErrorMessage}</p> : null}
      <div className="flex justify-between pt-2">
        <Button color="secondary" onClick={onBack}>
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back
        </Button>
        <Button onClick={onNext}>
          Next <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
