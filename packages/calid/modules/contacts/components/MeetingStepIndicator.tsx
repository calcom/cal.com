import { cn } from "@calid/features/lib/cn";
import { Icon } from "@calid/features/ui/components/icon";

import { useLocale } from "@calcom/lib/hooks/useLocale";

interface MeetingStepIndicatorProps {
  step: number;
  steps?: string[];
}

export const MeetingStepIndicator = ({ step, steps }: MeetingStepIndicatorProps) => {
  const { t } = useLocale();
  const defaultSteps = [
    t("contacts_event_type"),
    t("contacts_date_and_time"),
    t("contacts_guests"),
    t("contacts_confirm"),
  ];
  const resolvedSteps = steps && steps.length > 0 ? steps : defaultSteps;
  const clampedStep = Math.min(Math.max(step, 1), resolvedSteps.length);
  return (
    <div className="flex items-center gap-2 py-2">
      {resolvedSteps.map((_, index) => {
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
            {value < resolvedSteps.length ? (
              <div
                className={cn(
                  "h-px w-6",
                  isCompleted ? "bg-emphasis" : isActive ? "bg-active" : "bg-emphasis"
                )}
              />
            ) : null}
          </div>
        );
      })}
      {/* <span className="text-muted-foreground ml-2 text-xs">{steps[clampedStep - 1] ?? "Confirm"}</span> */}
    </div>
  );
};
