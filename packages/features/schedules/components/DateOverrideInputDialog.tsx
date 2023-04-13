import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { classNames } from "@calcom/lib";
import { daysInMonth, yyyymmdd } from "@calcom/lib/date-fns";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";
import type { WorkingHours } from "@calcom/types/schedule";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogClose,
  Switch,
  Form,
  Button,
} from "@calcom/ui";

import DatePicker from "../../calendars/DatePicker";
import type { TimeRange } from "./Schedule";
import { DayRanges } from "./Schedule";

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

const DateOverrideForm = ({
  value,
  workingHours,
  excludedDates,
  onChange,
  onClose = noop,
}: {
  workingHours?: WorkingHours[];
  onChange: (newValue: TimeRange[]) => void;
  excludedDates: string[];
  value?: TimeRange[];
  onClose?: () => void;
}) => {
  const [browsingDate, setBrowsingDate] = useState<Dayjs>();
  const { t, i18n, isLocaleReady } = useLocale();
  const [datesUnavailable, setDatesUnavailable] = useState(
    value &&
      value[0].start.getHours() === 0 &&
      value[0].start.getMinutes() === 0 &&
      value[0].end.getHours() === 0 &&
      value[0].end.getMinutes() === 0
  );

  const [date, setDate] = useState<Dayjs | null>(value ? dayjs(value[0].start) : null);
  const includedDates = useMemo(
    () =>
      workingHours
        ? workingHours.reduce((dates, workingHour) => {
            for (let dNum = 1; dNum <= daysInMonth(browsingDate || dayjs()); dNum++) {
              const d = browsingDate ? browsingDate.date(dNum) : dayjs.utc().date(dNum);
              if (workingHour.days.includes(d.day())) {
                dates.push(yyyymmdd(d));
              }
            }
            return dates;
          }, [] as string[])
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [browsingDate]
  );

  const form = useForm({
    values: {
      range: value
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
        : (workingHours || []).reduce((dayRanges, workingHour) => {
            if (date && workingHour.days.includes(date.day())) {
              dayRanges.push({
                start: dayjs.utc().startOf("day").add(workingHour.startTime, "minute").toDate(),
                end: dayjs.utc().startOf("day").add(workingHour.endTime, "minute").toDate(),
              });
            }
            return dayRanges;
          }, [] as TimeRange[]),
    },
  });

  return (
    <Form
      form={form}
      handleSubmit={(values) => {
        if (!date) return;
        onChange(
          (datesUnavailable
            ? [
                {
                  start: date.utc(true).startOf("day").toDate(),
                  end: date.utc(true).startOf("day").add(1, "day").toDate(),
                },
              ]
            : values.range
          ).map((item) => ({
            start: date.hour(item.start.getHours()).minute(item.start.getMinutes()).toDate(),
            end: date.hour(item.end.getHours()).minute(item.end.getMinutes()).toDate(),
          }))
        );
        onClose();
      }}
      className="p-6 sm:flex sm:p-0">
      <div className={classNames(date && "sm:border-subtle w-full sm:border-r sm:pr-6", "sm:p-4 md:p-8")}>
        <DialogHeader title={t("date_overrides_dialog_title")} />
        <DatePicker
          includedDates={includedDates}
          excludedDates={excludedDates}
          weekStart={0}
          selected={date}
          onChange={(day) => setDate(day)}
          onMonthChange={(newMonth) => {
            setBrowsingDate(newMonth);
          }}
          browsingDate={browsingDate}
          locale={isLocaleReady ? i18n.language : "en"}
        />
      </div>
      {date && (
        <div className="relative mt-8 flex w-full flex-col sm:mt-0 sm:p-4 md:p-8">
          <div className="mb-4 flex-grow space-y-4">
            <p className="text-medium text-emphasis text-sm">{t("date_overrides_dialog_which_hours")}</p>
            <div>
              {datesUnavailable ? (
                <p className="text-subtle rounded border p-2 text-sm">{t("date_overrides_unavailable")}</p>
              ) : (
                <DayRanges name="range" />
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
              disabled={!date}
              data-testid="add-override-submit-btn">
              {value ? t("date_overrides_update_btn") : t("date_overrides_add_btn")}
            </Button>
            <DialogClose onClick={onClose} />
          </div>
        </div>
      )}
    </Form>
  );
};

const DateOverrideInputDialog = ({
  Trigger,
  excludedDates = [],
  ...passThroughProps
}: {
  workingHours: WorkingHours[];
  excludedDates?: string[];
  Trigger: React.ReactNode;
  onChange: (newValue: TimeRange[]) => void;
  value?: TimeRange[];
}) => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [open, setOpen] = useState(false);
  {
    /* enableOverflow is used to allow overflow when there are too many overrides to show on mobile.
       ref:- https://github.com/calcom/cal.com/pull/6215
      */
  }
  const enableOverflow = isMobile;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{Trigger}</DialogTrigger>

      <DialogContent enableOverflow={enableOverflow} size="md" className="p-0">
        <DateOverrideForm
          excludedDates={excludedDates}
          {...passThroughProps}
          onClose={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};

export default DateOverrideInputDialog;
