import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "react-query";

import dayjs, { Dayjs } from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogClose } from "@calcom/ui/Dialog";
import DatePicker from "@calcom/ui/booker/DatePicker";
import { Switch } from "@calcom/ui/v2";
import Button from "@calcom/ui/v2/core/Button";
import { Form } from "@calcom/ui/v2/core/form/fields";

import { DayRanges } from "./Schedule";

const DateOverrideDialog = ({ Trigger }: { Trigger: React.ReactNode }) => {
  const { t } = useLocale();

  const form = useForm({
    defaultValues: {
      range: [
        {
          start: new Date(dayjs.utc().hour(11).minute(0).second(0).format()),
          end: new Date(dayjs.utc().hour(12).minute(0).second(0).format()),
        },
      ],
    },
  });
  const mutation = useMutation("availability.overrideDates");

  const [datesUnavailable, setDatesUnavailable] = useState(false);
  const [dates, setDates] = useState<Dayjs[]>([]);
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{Trigger}</DialogTrigger>
      <DialogContent size="xl">
        <Form
          form={form}
          handleSubmit={() => {
            setOpen(false);
            mutation.mutate();
          }}>
          <div className="flex space-x-4">
            <div className="border-r p-6">
              <DialogHeader title="Select the dates you want to override" />
              <DatePicker
                weekStart={0}
                selected={dates}
                isMulti
                onChange={(dates) => setDates([...dates])}
                locale="en-GB"
              />
            </div>
            <div className="relative flex flex-col p-6">
              <div className="flex-grow space-y-4">
                <p className="text-medium text-sm">Which hours are you available?</p>
                <div className="max-h-[245px] overflow-y-scroll pr-2">
                  {datesUnavailable ? (
                    <p className="rounded border p-2 text-sm text-neutral-500">Unavailable all day</p>
                  ) : (
                    <DayRanges control={form.control} name="range" />
                  )}
                </div>
                <Switch
                  label={t("mark_all_day_unavailable", { count: dates.length || 1 })}
                  checked={datesUnavailable}
                  onCheckedChange={setDatesUnavailable}
                />
                <div className="absolute bottom-5 right-5 space-x-2">
                  <DialogClose asChild>
                    <Button color="minimalSecondary">{t("cancel")}</Button>
                  </DialogClose>
                  <Button type="submit">{t("override_add_btn")}</Button>
                </div>
              </div>
            </div>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default DateOverrideDialog;
