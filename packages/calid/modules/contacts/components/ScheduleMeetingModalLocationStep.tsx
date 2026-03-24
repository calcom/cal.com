import { cn } from "@calid/features/lib/cn";
import { Button } from "@calid/features/ui/components/button";
import { Label } from "@calid/features/ui/components/label";
import { ArrowLeft, ArrowRight, MapPin } from "lucide-react";

type LocationOption = {
  type: string;
  label: string;
};

interface ScheduleMeetingModalLocationStepProps {
  locationOptions: LocationOption[];
  selectedLocationType: string | null;
  onSelectLocationType: (locationType: string) => void;
  fallbackNotice: string | null;
  unsupportedReason: string | null;
  onBack: () => void;
  onNext: () => void;
}

export const ScheduleMeetingModalLocationStep = ({
  locationOptions,
  selectedLocationType,
  onSelectLocationType,
  fallbackNotice,
  unsupportedReason,
  onBack,
  onNext,
}: ScheduleMeetingModalLocationStepProps) => {
  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <Label>Select Location</Label>
        <p className="text-muted-foreground text-xs">Choose where this meeting will take place.</p>
      </div>

      {fallbackNotice ? (
        <p className="text-muted-foreground rounded-lg border px-3 py-2 text-xs">{fallbackNotice}</p>
      ) : null}

      <div className="space-y-2">
        {locationOptions.map((locationOption) => (
          <button
            key={locationOption.type}
            onClick={() => onSelectLocationType(locationOption.type)}
            className={cn(
              "w-full rounded-lg border px-4 py-3 text-left transition-colors",
              selectedLocationType === locationOption.type
                ? "border-primary bg-muted"
                : "border-border hover:bg-muted/50"
            )}>
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-3.5 w-3.5" />
              {locationOption.label}
            </div>
          </button>
        ))}
      </div>

      {unsupportedReason ? <p className="text-xs text-red-600">{unsupportedReason}</p> : null}

      <div className="flex justify-between pt-2">
        <Button color="secondary" onClick={onBack}>
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back
        </Button>
        <Button disabled={!selectedLocationType || Boolean(unsupportedReason)} onClick={onNext}>
          Next <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
