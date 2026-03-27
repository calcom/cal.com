import { cn } from "@calid/features/lib/cn";
import { Button } from "@calid/features/ui/components/button";
import { Calendar } from "@calid/features/ui/components/calendar";
import { Input } from "@calid/features/ui/components/input/input";
import { Label } from "@calid/features/ui/components/label";
import { Popover, PopoverContent, PopoverTrigger } from "@calid/features/ui/components/popover";
import { ToggleGroup } from "@calid/features/ui/components/toggle-group";
import { format, isBefore, parseISO, startOfDay } from "date-fns";
import { ArrowLeft, ArrowRight, CalendarIcon, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { TimeFormat } from "@calcom/lib/timeFormat";

type SlotOption = {
  time: string;
};

interface ScheduleMeetingModalDateTimeStepProps {
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

export const ScheduleMeetingModalDateTimeStep = ({
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
}: ScheduleMeetingModalDateTimeStepProps) => {
  const { t } = useLocale();
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);

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
      {/* Date picker */}
      <div className="space-y-1.5">
        <Label>{t("contacts_select_date")}</Label>
        <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              color="secondary"
              className={cn("w-full justify-start text-left", !selectedDate && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
              {selectedDate ? format(selectedDate, "PPP") : t("contacts_pick_a_date")}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="bg-default w-auto border p-0"
            // Keep calendar inside viewport on small screens
            side="bottom"
            avoidCollisions>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(value) => {
                onSelectDate(value);
                if (value) {
                  setIsDatePopoverOpen(false);
                }
              }}
              disabled={(date) => isBefore(date, startOfDay(new Date()))}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Duration */}
      {selectedDate ? (
        <div className="space-y-1.5 pt-2">
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

      {/* Time slots */}
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
            /* Responsive slot grid: 3 cols on mobile, 4 on sm+ */
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

      {/* Recurring settings */}
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

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button color="secondary" onClick={onBack}>
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> {t("back")}
        </Button>
        <Button disabled={!canContinue || !isRecurringSelectionValid} onClick={onNext}>
          {t("next")} <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
