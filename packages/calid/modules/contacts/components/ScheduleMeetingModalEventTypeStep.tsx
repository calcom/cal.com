import { cn } from "@calid/features/lib/cn";
import { Button } from "@calid/features/ui/components/button";
import { Label } from "@calid/features/ui/components/label";
import { ArrowRight, Clock, Loader2 } from "lucide-react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

type EventTypeOption = {
  id: number;
  title: string;
  length: number;
};

interface ScheduleMeetingModalEventTypeStepProps {
  eventTypes: EventTypeOption[];
  selectedEventId: number | null;
  onSelectEventType: (eventTypeId: number) => void;
  isEventTypesLoading: boolean;
  eventTypesErrorMessage: string | null;
  onRetryEventTypes: () => void;
  isSelectedEventLoading: boolean;
  selectedEventErrorMessage: string | null;
  unsupportedReason: string | null;
  onNext: () => void;
  isNextDisabled: boolean;
}

export const ScheduleMeetingModalEventTypeStep = ({
  eventTypes,
  selectedEventId,
  onSelectEventType,
  isEventTypesLoading,
  eventTypesErrorMessage,
  onRetryEventTypes,
  isSelectedEventLoading,
  selectedEventErrorMessage,
  unsupportedReason,
  onNext,
  isNextDisabled,
}: ScheduleMeetingModalEventTypeStepProps) => {
  const { t } = useLocale();

  return (
    <div className="flex min-h-0 flex-col gap-3 pt-2">
      <Label>{t("select_event_type")}</Label>

      {isEventTypesLoading ? (
        <div className="text-muted-foreground flex items-center gap-2 py-3 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("contacts_loading_event_types")}
        </div>
      ) : null}

      {eventTypesErrorMessage ? (
        <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <p>{eventTypesErrorMessage || t("contacts_failed_to_load_event_types")}</p>
          <Button color="secondary" size="sm" onClick={onRetryEventTypes}>
            {t("retry")}
          </Button>
        </div>
      ) : null}

      {!isEventTypesLoading && !eventTypesErrorMessage && eventTypes.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border px-3 py-2 text-sm">
          {t("contacts_no_event_types_available_for_scheduling")}
        </p>
      ) : null}

      {!isEventTypesLoading && !eventTypesErrorMessage ? (
        /* Constrained scroll area so event list doesn't push footer off-screen */
        <div className="max-h-[40vh] min-h-0 space-y-2 overflow-y-auto pr-0.5">
          {eventTypes.map((eventType) => (
            <button
              key={eventType.id}
              onClick={() => onSelectEventType(eventType.id)}
              className={cn(
                "w-full rounded-lg border px-4 py-3 text-left transition-colors",
                selectedEventId === eventType.id ? "border-primary bg-muted" : "border-border hover:bg-muted"
              )}>
              <div className="text-sm font-medium">{eventType.title}</div>
              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3" /> {t("contacts_duration_in_min", { duration: eventType.length })}
              </div>
            </button>
          ))}
        </div>
      ) : null}

      {selectedEventId !== null && isSelectedEventLoading ? (
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t("contacts_checking_event_type_access")}
        </div>
      ) : null}

      {selectedEventErrorMessage ? (
        <p className="text-xs text-red-600">
          {selectedEventErrorMessage || t("contacts_no_permission_to_schedule_event_type")}
        </p>
      ) : null}

      {unsupportedReason ? <p className="text-xs text-red-600">{unsupportedReason}</p> : null}

      <div className="flex justify-end pt-1">
        <Button disabled={isNextDisabled} onClick={onNext}>
          {t("next")} <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
