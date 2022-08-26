import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "react-query";

import { Dayjs } from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Tooltip } from "@calcom/ui";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogFooter } from "@calcom/ui/Dialog";
import DatePicker from "@calcom/ui/booker/DatePicker";
import { Form } from "@calcom/ui/form/fields";
import { Switch } from "@calcom/ui/v2";

import { DayRanges } from "@components/availability/Schedule";

const DateOverrideDialog = ({ Trigger }: { Trigger: React.ReactNode }) => {
  const { t } = useLocale();

  const form = useForm();
  const mutation = useMutation("availability.overrideDates");

  const [datesUnavailable, setDatesUnavailable] = useState(false);
  const [dates, setDates] = useState<Dayjs[]>([]);
  return (
    <Dialog>
      <DialogTrigger asChild>{Trigger}</DialogTrigger>
      <DialogContent size="xl">
        <Form form={form} handleSubmit={() => mutation.mutate()}>
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
            <div className="flex flex-col p-6">
              <div className="flex-grow space-y-4">
                <p className="text-medium text-sm">Which hours are you available?</p>
                {datesUnavailable ? (
                  <p className="rounded border p-2 text-sm text-neutral-500">Unavailable all day</p>
                ) : (
                  <DayRanges name="range" />
                )}

                <Switch
                  label={t("mark_all_day_unavailable", { count: dates.length || 1 })}
                  checked={datesUnavailable}
                  onCheckedChange={setDatesUnavailable}
                />
              </div>
              <div className="flex-none">
                <DialogFooter>
                  <Button color="secondary">{t("cancel")}</Button>
                  {mutation.isLoading || !dates.length ? (
                    <Tooltip delayDuration={0} content="Please select a date to override">
                      <span tabIndex={0}>
                        <Button disabled={true} style={{ pointerEvents: "none" }}>
                          Add Override
                        </Button>
                      </span>
                    </Tooltip>
                  ) : (
                    <Button>Add Override</Button>
                  )}
                </DialogFooter>
              </div>
            </div>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default DateOverrideDialog;
