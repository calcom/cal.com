import { useForm } from "react-hook-form";
import { useMutation } from "react-query";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Icon } from "@calcom/ui";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogFooter } from "@calcom/ui/Dialog";
import DatePicker from "@calcom/ui/booker/DatePicker";
import { Form } from "@calcom/ui/form/fields";

import { DayRanges } from "@components/availability/Schedule";
import { DateRangePicker } from "@components/ui/form/DateRangePicker";

const DateOverrideDialog = () => {
  const { t } = useLocale();

  const form = useForm();
  const mutation = useMutation("availability.overrideDates");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button color="secondary" StartIcon={Icon.FiPlus}>
          Add an override
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader title="Select the dates you want to override" />

        <Form form={form} handleSubmit={() => mutation.mutate()}>
          <DatePicker
            onChange={() => {
              return;
            }}
            locale="en-GB"
            className="mb-4"
          />
          <div>
            <p className="text-medium mb-2 text-sm">What hours are you available?</p>
            <DayRanges name="range" />
          </div>
        </Form>

        <DialogFooter>
          <Button color="secondary">{t("cancel")}</Button>
          <Button disabled={mutation.isLoading}>{t("confirm")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DateOverrideDialog;
