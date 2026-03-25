import { cn } from "@calid/features/lib/cn";
import { Icon } from "@calid/features/ui/components/icon";

interface MeetingStepIndicatorProps {
  step: number;
  steps?: string[];
}

const DEFAULT_STEPS = ["Event Type", "Date & Time", "Guests", "Confirm"];

export const MeetingStepIndicator = ({ step, steps = DEFAULT_STEPS }: MeetingStepIndicatorProps) => {
  const clampedStep = Math.min(Math.max(step, 1), steps.length);
  return (
    <div className="flex items-center gap-2 py-2">
      {steps.map((_, index) => {
        const value = index + 1;
        const isCompleted = value < clampedStep;
        const isActive = value === clampedStep;
        const isUpcoming = value > clampedStep;
        return (
          <div key={value} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                isCompleted && " bg-subtle text-emphasis",
                isActive && " bg-active text-white",
                isUpcoming && " bg-default text-muted-foreground"
              )}
              aria-current={isActive ? "step" : undefined}>
              {isCompleted ? <Icon name="check" className="h-3.5 w-3.5" /> : value}
            </div>
            {value < steps.length ? (
              <div
                className={cn("h-px w-6", isCompleted ? "bg-emphasis" : isActive ? "bg-active" : "bg-emphasis")}
              />
            ) : null}
          </div>
        );
      })}
      {/* <span className="text-muted-foreground ml-2 text-xs">{steps[clampedStep - 1] ?? "Confirm"}</span> */}
    </div>
  );
};
