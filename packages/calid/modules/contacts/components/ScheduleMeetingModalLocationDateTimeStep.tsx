import { cn } from "@calid/features/lib/cn";
import { Button } from "@calid/features/ui/components/button";
import { Calendar } from "@calid/features/ui/components/calendar";
import { Input } from "@calid/features/ui/components/input/input";
import { Label } from "@calid/features/ui/components/label";
import { ToggleGroup } from "@calid/features/ui/components/toggle-group";
import { format, isBefore, parseISO, startOfDay } from "date-fns";
import { ArrowLeft, ArrowRight, Loader2, MapPin } from "lucide-react";
import { useEffect } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { TimeFormat } from "@calcom/lib/timeFormat";

type LocationOption = {
  type: string;
  label: string;
};

type SlotOption = {
  time: string;
};

interface ScheduleMeetingModalLocationDateTimeStepProps {
  locationOptions: LocationOption[];
  selectedLocationType: string | null;
  onSelectLocationType: (locationType: string) => void;
  fallbackNotice: string | null;
  unsupportedReason: string | null;
  selectedDate?: Date;
  onSelectDate: (value?: Date) => void;
  selectedDuration: number | null;
  durationOptions: number[];
  onSelectDuration: (duration: number) => void;
  selectedSlotTime: string | null;
  onSelectSlotTime: (slotTime: string | null) => void;
  availableSlots: SlotOption[];
  isDurationLoading: boolean;
  durationErrorMessage: string | null;
  isSlotsLoading: boolean;
  slotsErrorMessage: string | null;
  onRetrySlots: () => void;
  timeFormat: TimeFormat.TWELVE_HOUR | TimeFormat.TWENTY_FOUR_HOUR;
  onTimeFormatChange: (timeFormat: TimeFormat.TWELVE_HOUR | TimeFormat.TWENTY_FOUR_HOUR) => void;
  timeFormat12hLabel: string;
  timeFormat24hLabel: string;
  isRecurringEventType: boolean;
  recurringPatternText: string | null;
  recurringMaxCount: number | null;
  recurringEventCountInput: string;
  onRecurringCountInputChange: (value: string) => void;
  recurringEventCountWarning: string | null;
  recurringSummaryText: string | null;
  recurringOccurrencePreview: string[];
  recurringEventCount: number | null;
  isRecurringSelectionValid: boolean;
  onBack: () => void;
  onNext: () => void;
  canContinue: boolean;
}

export const ScheduleMeetingModalLocationDateTimeStep = ({
  locationOptions,
  selectedLocationType,
  onSelectLocationType,
  fallbackNotice,
  unsupportedReason,
  selectedDate,
  onSelectDate,
  selectedDuration,
  durationOptions,
  onSelectDuration,
  selectedSlotTime,
  onSelectSlotTime,
  availableSlots,
  isDurationLoading,
  durationErrorMessage,
  isSlotsLoading,
  slotsErrorMessage,
  onRetrySlots,
  timeFormat,
  onTimeFormatChange,
  timeFormat12hLabel,
  timeFormat24hLabel,
  isRecurringEventType,
  recurringPatternText,
  recurringMaxCount,
  recurringEventCountInput,
  onRecurringCountInputChange,
  recurringEventCountWarning,
  recurringSummaryText,
  recurringOccurrencePreview,
  recurringEventCount,
  isRecurringSelectionValid,
  onBack,
  onNext,
  canContinue,
}: ScheduleMeetingModalLocationDateTimeStepProps) => {
  const { t } = useLocale();
  const hasMultipleLocations = locationOptions.length > 1;

  useEffect(() => {
    if (!selectedSlotTime) {
      return;
    }

    const hasSelectedSlot = availableSlots.some((slot) => slot.time === selectedSlotTime);
    if (!hasSelectedSlot) {
      onSelectSlotTime(null);
    }
  }, [availableSlots, onSelectSlotTime, selectedSlotTime]);

  return (
    <div className="space-y-4 pt-2">
      {hasMultipleLocations ? (
        <div className="space-y-2">
          <div className="space-y-1.5">
            <Label>{t("contacts_select_location")}</Label>
            <p className="text-muted-foreground text-xs">{t("contacts_choose_meeting_location")}</p>
          </div>
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
        </div>
      ) : null}

      {fallbackNotice ? (
        <p className="text-muted-foreground rounded-lg border px-3 py-2 text-xs">{fallbackNotice}</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <div className="space-y-1.5">
          <Label>{t("contacts_select_date")}</Label>
          <div className="bg-default rounded-lg border p-2">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={onSelectDate}
              disabled={(date) => isBefore(date, startOfDay(new Date()))}
              className="pointer-events-auto w-full"
              classNames={{
                months: "w-full",
                month: "w-full space-y-4",
                head_row: "grid grid-cols-7",
                head_cell: "text-muted-foreground rounded-md w-full text-center font-normal text-[0.8rem]",
                row: "mt-2 grid w-full grid-cols-7",
                cell: "relative h-9 w-full p-0 text-center text-sm",
                day: "h-9 w-full p-0 font-normal aria-selected:opacity-100",
              }}
            />
          </div>
          {/* {selectedDate ? (
            <p className="text-muted-foreground text-xs">{format(selectedDate, "PPP")}</p>
          ) : null} */}
        </div>

        <div className="space-y-4 md:pt-7">
          {selectedDate ? (
            <div className="flex flex-col space-y-1.5">
              <Label>{t("duration")}</Label>
              {isDurationLoading ? (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("contacts_loading_duration_options")}
                </div>
              ) : null}
              {durationErrorMessage ? (
                <p className="text-xs text-red-600">
                  {durationErrorMessage || t("contacts_could_not_load_duration_options")}
                </p>
              ) : null}
              {!isDurationLoading && !durationErrorMessage && durationOptions.length > 0 ? (
                <ToggleGroup
                  value={selectedDuration ? `${selectedDuration}` : ""}
                  onValueChange={(value) => {
                    const nextDuration = Number(value);
                    if (!value || Number.isNaN(nextDuration) || nextDuration === selectedDuration) {
                      return;
                    }
                    onSelectDuration(nextDuration);
                  }}
                  options={durationOptions.map((duration) => ({
                    value: `${duration}`,
                    label: t("contacts_duration_in_min", { duration }),
                  }))}
                />
              ) : null}
              {!isDurationLoading && !durationErrorMessage && durationOptions.length === 0 ? (
                <p className="text-muted-foreground text-xs">{t("contacts_no_duration_options_available")}</p>
              ) : null}
            </div>
          ) : null}

          {selectedDate ? (
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>{t("select_time")}</Label>
                <ToggleGroup
                  value={timeFormat}
                  onValueChange={(value) => {
                    if (value && value !== timeFormat) {
                      onTimeFormatChange(value as TimeFormat.TWELVE_HOUR | TimeFormat.TWENTY_FOUR_HOUR);
                    }
                  }}
                  options={[
                    { value: TimeFormat.TWELVE_HOUR, label: timeFormat12hLabel },
                    { value: TimeFormat.TWENTY_FOUR_HOUR, label: timeFormat24hLabel },
                  ]}
                />
              </div>
              {isSlotsLoading ? (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("contacts_loading_available_slots")}
                </div>
              ) : null}
              {slotsErrorMessage ? (
                <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <p>{slotsErrorMessage || t("contacts_failed_to_load_time_slots")}</p>
                  <Button color="secondary" size="sm" onClick={onRetrySlots}>
                    {t("retry")}
                  </Button>
                </div>
              ) : null}
              {!isSlotsLoading && !slotsErrorMessage && availableSlots.length === 0 ? (
                <p className="text-muted-foreground rounded-lg border px-3 py-2 text-xs">
                  {t("contacts_no_available_slots_for_this_date")}
                </p>
              ) : null}
              {!isSlotsLoading && !slotsErrorMessage && availableSlots.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => onSelectSlotTime(slot.time)}
                      className={cn(
                        "rounded-md border px-2 py-2 text-xs transition-colors",
                        selectedSlotTime === slot.time
                          ? "border-subtle bg-muted text-default font-medium shadow-[0px_2px_3px_0px_rgba(0,0,0,0.03),0px_2px_2px_-1px_rgba(0,0,0,0.03)]"
                          : "border-border hover:bg-muted hover:text-emphasis"
                      )}>
                      {format(parseISO(slot.time), timeFormat)}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {isRecurringEventType ? (
        <div className="space-y-2 rounded-lg border px-3 py-3">
          <div className="space-y-1">
            <Label>{t("contacts_recurrence")}</Label>
            {recurringPatternText ? (
              <p className="text-muted-foreground text-xs capitalize">{recurringPatternText}</p>
            ) : (
              <p className="text-muted-foreground text-xs">
                {t("contacts_event_repeats_on_recurring_schedule")}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="recurring-count">{t("contacts_occurrences")}</Label>
            <Input
              id="recurring-count"
              type="number"
              min={1}
              max={recurringMaxCount ?? undefined}
              value={recurringEventCountInput}
              onChange={(event) => onRecurringCountInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (["-", "+", "e", "E"].includes(event.key)) {
                  event.preventDefault();
                }
              }}
              className="max-w-[120px]"
            />
            {recurringMaxCount ? (
              <p className="text-muted-foreground text-xs">
                {t("contacts_choose_between_one_and_max", { max: recurringMaxCount })}
              </p>
            ) : (
              <p className="text-muted-foreground text-xs">{t("contacts_choose_how_many_occurrences")}</p>
            )}
            {recurringEventCountWarning ? (
              <p className="text-xs text-amber-700">{recurringEventCountWarning}</p>
            ) : null}
          </div>
          {recurringSummaryText ? <p className="text-xs font-medium">{recurringSummaryText}</p> : null}
          {recurringOccurrencePreview.length > 0 ? (
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">{t("contacts_upcoming_occurrences")}</p>
              <ul className="space-y-1 text-xs">
                {recurringOccurrencePreview.map((occurrence, index) => (
                  <li key={`${occurrence}-${index}`} className="text-muted-foreground">
                    {occurrence}
                  </li>
                ))}
                {recurringEventCount && recurringEventCount > recurringOccurrencePreview.length ? (
                  <li className="text-muted-foreground">
                    {t("contacts_more_occurrences", {
                      count: recurringEventCount - recurringOccurrencePreview.length,
                    })}
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {unsupportedReason ? <p className="text-xs text-red-600">{unsupportedReason}</p> : null}

      <div className="flex justify-between pt-2">
        <Button color="secondary" onClick={onBack}>
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> {t("back")}
        </Button>
        <Button
          disabled={!canContinue || !isRecurringSelectionValid || Boolean(unsupportedReason)}
          onClick={onNext}>
          {t("next")} <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
