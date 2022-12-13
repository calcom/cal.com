import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";

import dayjs, { Dayjs } from "@calcom/dayjs";
import { yyyymmdd } from "@calcom/lib/date-fns";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogClose,
  Switch,
  DatePicker,
  Form,
  Button,
} from "@calcom/ui";

import { DayRanges, TimeRange } from "./Schedule";

const ALL_DAY_RANGE = {
  start: new Date(dayjs.utc().hour(0).minute(0).second(0).format()),
  end: new Date(dayjs.utc().hour(23).minute(59).second(0).format()),
};
const excludedDates = ["2022-12-17", "2022-12-10", "2022-12-03"];
// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

const DateOverrideForm = ({
  value = [
    {
      start: new Date(dayjs.utc().hour(11).minute(0).second(0).format()),
      end: new Date(dayjs.utc().hour(12).minute(0).second(0).format()),
    },
  ],
  onChange,
  onClose = noop,
}: {
  onChange: (newValue: TimeRange[]) => void;
  value?: TimeRange[];
  onClose?: () => void;
}) => {
  const { t } = useLocale();
  const [datesUnavailable, setDatesUnavailable] = useState(
    value[0].start.getHours() === 0 &&
      value[0].start.getMinutes() === 0 &&
      value[0].end.getHours() === 23 &&
      value[0].end.getMinutes() === 59
  );
  const [date, setDate] = useState<Dayjs | null>(value ? dayjs(value[0].start) : null);

  const form = useForm({
    defaultValues: {
      range: value.map((range) => ({
        start: new Date(
          dayjs.utc().hour(range.start.getHours()).minute(range.start.getMinutes()).second(0).format()
        ),
        end: new Date(
          dayjs.utc().hour(range.end.getHours()).minute(range.end.getMinutes()).second(0).format()
        ),
      })),
    },
  });

  useEffect(() => {
    // dates unavailable is an invalid option on an excluded date: untoggle it.
    if (date && excludedDates.includes(yyyymmdd(date))) {
      setDatesUnavailable(false);
    }
  }, [date]);

  return (
    <Form
      form={form}
      handleSubmit={(values) => {
        if (!date) return;
        onChange(
          (datesUnavailable ? [ALL_DAY_RANGE] : values.range).map((item) => ({
            start: date.hour(item.start.getHours()).minute(item.start.getMinutes()).toDate(),
            end: date.hour(item.end.getHours()).minute(item.end.getMinutes()).toDate(),
          }))
        );
        onClose();
      }}
      className="flex space-x-4">
      <div className="w-1/2 border-r pr-6">
        <DialogHeader title={t("date_overrides_dialog_title")} />
        <DatePicker weekStart={0} selected={date} onChange={(day) => setDate(day)} locale="en-GB" />
      </div>
      <div className="relative flex w-1/2 flex-col pl-2">
        <div className="mb-4 flex-grow space-y-4">
          <p className="text-medium text-sm">
            {t(
              date && !excludedDates.includes(yyyymmdd(date))
                ? "date_overrides_dialog_which_hours_unavailable"
                : "date_overrides_dialog_which_hours"
            )}
          </p>
          <div>
            {datesUnavailable ? (
              <p className="rounded border p-2 text-sm text-neutral-500">{t("date_overrides_unavailable")}</p>
            ) : (
              <DayRanges name="range" />
            )}
          </div>
          {date && !excludedDates.includes(yyyymmdd(date)) && (
            <Switch
              label={t("date_overrides_mark_all_day_unavailable_one")}
              checked={datesUnavailable}
              onCheckedChange={setDatesUnavailable}
            />
          )}
        </div>
        <div className="flex flex-row-reverse">
          <Button className="ml-2" color="primary" type="submit" disabled={!date}>
            {t("date_overrides_add_btn")}
          </Button>
          <DialogClose onClick={onClose} />
        </div>
      </div>
    </Form>
  );
};

const DateOverrideInputDialog = ({
  Trigger,
  ...passThroughProps
}: {
  Trigger: React.ReactNode;
  onChange: (newValue: TimeRange[]) => void;
  value?: TimeRange[];
}) => {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{Trigger}</DialogTrigger>
      <DialogContent size="md">
        <DateOverrideForm {...passThroughProps} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};

export default DateOverrideInputDialog;
