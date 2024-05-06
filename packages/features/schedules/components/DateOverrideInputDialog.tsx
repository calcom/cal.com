import { useState } from "react";
import { useForm } from "react-hook-form";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { yyyymmdd } from "@calcom/lib/date-fns";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { WorkingHours } from "@calcom/types/schedule";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogClose,
  Switch,
  showToast,
  Form,
  Button,
} from "@calcom/ui";

import DatePicker from "../../calendars/DatePicker";
import type { TimeRange } from "./Schedule";
import { DayRanges } from "./Schedule";

const DateOverrideForm = ({
  value,
  workingHours,
  excludedDates,
  onChange,
  userTimeFormat,
  weekStart,
}: {
  workingHours?: WorkingHours[];
  onChange: (newValue: TimeRange[]) => void;
  excludedDates: string[];
  value?: TimeRange[];
  onClose?: () => void;
  userTimeFormat: number | null;
  weekStart: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}) => {
  const [browsingDate, setBrowsingDate] = useState<Dayjs>();
  const { t, i18n, isLocaleReady } = useLocale();
  const [datesUnavailable, setDatesUnavailable] = useState(
    value &&
      value[0].start.getUTCHours() === 0 &&
      value[0].start.getUTCMinutes() === 0 &&
      value[0].end.getUTCHours() === 0 &&
      value[0].end.getUTCMinutes() === 0
  );

  const [selectedDates, setSelectedDates] = useState<Dayjs[]>(value ? [dayjs.utc(value[0].start)] : []);

  const onDateChange = (newDate: Dayjs) => {
    // If clicking on a selected date unselect it
    if (selectedDates.some((date) => yyyymmdd(date) === yyyymmdd(newDate))) {
      setSelectedDates(selectedDates.filter((date) => yyyymmdd(date) !== yyyymmdd(newDate)));
      return;
    }

    // If it's not editing we can allow multiple select
    if (!value) {
      setSelectedDates((prev) => [...prev, newDate]);
      return;
    }

    setSelectedDates([newDate]);
  };

  const defaultRanges = (workingHours || []).reduce((dayRanges: TimeRange[], workingHour) => {
    if (selectedDates[0] && workingHour.days.includes(selectedDates[0].day())) {
      dayRanges.push({
        start: dayjs.utc().startOf("day").add(workingHour.startTime, "minute").toDate(),
        end: dayjs.utc().startOf("day").add(workingHour.endTime, "minute").toDate(),
      });
    }
    return dayRanges;
  }, []);
  // DayRanges does not support empty state, add 9-5 as a default
  if (!defaultRanges.length) {
    defaultRanges.push({
      start: dayjs.utc().startOf("day").add(540, "minute").toDate(),
      end: dayjs.utc().startOf("day").add(1020, "minute").toDate(),
    });
  }

  const form = useForm({
    values: {
      range:
        value && value[0].start.valueOf() !== value[0].end.valueOf()
          ? value.map((range) => ({
              start: new Date(
                dayjs
                  .utc()
                  .hour(range.start.getUTCHours())
                  .minute(range.start.getUTCMinutes())
                  .second(0)
                  .format()
              ),
              end: new Date(
                dayjs.utc().hour(range.end.getUTCHours()).minute(range.end.getUTCMinutes()).second(0).format()
              ),
            }))
          : defaultRanges,
    },
  });

  return (
    <Form
      form={form}
      handleSubmit={(values) => {
        if (selectedDates.length === 0) return;

        const datesInRanges: TimeRange[] = [];

        if (!datesUnavailable) {
          selectedDates.map((date) => {
            values.range.map((item) => {
              datesInRanges.push({
                start: date
                  .hour(item.start.getUTCHours())
                  .minute(item.start.getUTCMinutes())
                  .utc(true)
                  .toDate(),
                end: date.hour(item.end.getUTCHours()).minute(item.end.getUTCMinutes()).utc(true).toDate(),
              });
            });
          });
        }

        onChange(
          datesUnavailable
            ? selectedDates.map((date) => {
                return {
                  start: date.utc(true).startOf("day").toDate(),
                  end: date.utc(true).startOf("day").toDate(),
                };
              })
            : datesInRanges
        );
        setSelectedDates([]);
      }}
      className="p-6 sm:flex sm:p-0 xl:flex-row">
      <div className="sm:border-subtle w-full sm:border-r sm:p-4 sm:pr-6 md:p-8">
        <DialogHeader title={t("date_overrides_dialog_title")} />
        <DatePicker
          excludedDates={excludedDates}
          weekStart={weekStart}
          selected={selectedDates}
          onChange={(day) => {
            if (day) onDateChange(day);
          }}
          onMonthChange={(newMonth) => {
            setBrowsingDate(newMonth);
          }}
          browsingDate={browsingDate}
          locale={isLocaleReady ? i18n.language : "en"}
        />
      </div>
      <div className="relative mt-8 flex w-full flex-col sm:mt-0 sm:p-4 md:p-8">
        {selectedDates[0] ? (
          <>
            <div className="mb-4 flex-grow space-y-4">
              <p className="text-medium text-emphasis text-sm">{t("date_overrides_dialog_which_hours")}</p>
              <div>
                {datesUnavailable ? (
                  <p className="text-subtle border-default rounded border p-2 text-sm">
                    {t("date_overrides_unavailable")}
                  </p>
                ) : (
                  <DayRanges name="range" userTimeFormat={userTimeFormat} />
                )}
              </div>
              <Switch
                label={t("date_overrides_mark_all_day_unavailable_one")}
                checked={datesUnavailable}
                onCheckedChange={setDatesUnavailable}
                data-testid="date-override-mark-unavailable"
              />
            </div>
            <div className="mt-4 flex flex-row-reverse sm:mt-0">
              <Button
                className="ml-2"
                color="primary"
                type="submit"
                onClick={() => {
                  showToast(t("date_successfully_added"), "success", 500);
                }}
                disabled={selectedDates.length === 0}
                data-testid="add-override-submit-btn">
                {value ? t("date_overrides_update_btn") : t("date_overrides_add_btn")}
              </Button>
              <DialogClose />
            </div>
          </>
        ) : (
          <div className="bottom-7 right-8 flex flex-row-reverse sm:absolute">
            <DialogClose />
          </div>
        )}
      </div>
    </Form>
  );
};

const DateOverrideInputDialog = ({
  Trigger,
  excludedDates = [],
  userTimeFormat,
  weekStart = 0,
  ...passThroughProps
}: {
  workingHours: WorkingHours[];
  excludedDates?: string[];
  Trigger: React.ReactNode;
  onChange: (newValue: TimeRange[]) => void;
  value?: TimeRange[];
  userTimeFormat: number | null;
  weekStart?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{Trigger}</DialogTrigger>

      <DialogContent enableOverflow={true} size="md" className="p-0">
        <DateOverrideForm
          excludedDates={excludedDates}
          weekStart={weekStart}
          {...passThroughProps}
          onClose={() => setOpen(false)}
          userTimeFormat={userTimeFormat}
        />
      </DialogContent>
    </Dialog>
  );
};

export default DateOverrideInputDialog;
