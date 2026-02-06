import { generateRecurringInstances } from "@calid/features/modules/teams/lib/recurrenceUtil";
import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@calid/features/ui/components/dialog";
import { Form, FormField } from "@calid/features/ui/components/form/form";
import { Icon } from "@calid/features/ui/components/icon";
import { CheckboxField } from "@calid/features/ui/components/input/checkbox-field";
import { Input } from "@calid/features/ui/components/input/input";
import { ScrollArea } from "@calid/features/ui/components/scroll-area";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RecurringEvent } from "@calcom/types/Calendar";

dayjs.extend(utc);
dayjs.extend(timezone);

interface CancelInstanceDate {
  date: string;
  isSelected: boolean;
}

interface CancelInstancesDialogProps {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  bookingUid: string;
  recurringEvent: RecurringEvent;
  eventStartTime: Date;
  userTimeZone: string;
  userTimeFormat: number | null;
  onSubmitCancelInstances: (selectedDates: Date[]) => void;
}

const validateDate = (dateInput: string | Date): Date | null => {
  try {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) {
      console.error("Invalid date:", dateInput);
      return null;
    }
    return date;
  } catch (error) {
    console.error("Error validating date:", dateInput, error);
    return null;
  }
};

export const CancelInstancesDialog = ({
  isOpenDialog,
  setIsOpenDialog,
  bookingUid,
  recurringEvent,
  eventStartTime,
  userTimeZone,
  userTimeFormat,
  onSubmitCancelInstances,
}: CancelInstancesDialogProps) => {
  const { t } = useLocale();
  const now = useMemo(() => new Date(), []);
  const [searchQuery, setSearchQuery] = useState("");

  const validatedEventStartTime = useMemo(() => {
    const validDate = validateDate(eventStartTime);
    if (!validDate) {
      console.error("Invalid eventStartTime provided:", eventStartTime);
      return new Date();
    }
    return validDate;
  }, [eventStartTime]);

  const allRecurringDates = useMemo(() => {
    if (!recurringEvent || typeof recurringEvent.freq === "undefined") {
      console.warn("No valid recurringEvent provided");
      return [];
    }
    return generateRecurringInstances(recurringEvent, validatedEventStartTime);
  }, [recurringEvent, validatedEventStartTime]);

  const futureDates = useMemo(() => {
    return allRecurringDates
      .filter((date) => {
        const validDate = validateDate(date);
        return validDate && validDate > now;
      })
      .sort((a, b) => a.getTime() - b.getTime())
      .map((date) => ({
        date: date.toISOString(),
        isSelected: false,
      }));
  }, [allRecurringDates, now]);

  const form = useForm<{ instances: CancelInstanceDate[] }>({
    defaultValues: { instances: futureDates },
    mode: "onBlur",
  });

  const { control, watch } = form;
  const watchedInstances = watch("instances");
  const isSubmitDisabled = !watchedInstances?.some((instance) => instance.isSelected);

  const { fields } = useFieldArray({ control, name: "instances" });

  const filteredFields = useMemo(() => {
    if (!searchQuery.trim()) return fields;

    return fields.filter((field) => {
      const formatted = dayjs(field.date)
        .tz(userTimeZone)
        .format(userTimeFormat === 24 ? "dddd, D MMM YYYY HH:mm" : "dddd, D MMM YYYY h:mm A")
        .toLowerCase();

      return formatted.includes(searchQuery.toLowerCase());
    });
  }, [fields, searchQuery, userTimeZone, userTimeFormat]);

  const shouldShowSearch = futureDates.length > 10;
  const shouldUseScrollArea = futureDates.length > 10;

  const handleCancel = (data: { instances: CancelInstanceDate[] }) => {
    try {
      const selectedDates = data.instances
        .filter((item) => item.isSelected)
        .map((item) => {
          const date = validateDate(item.date);
          if (!date) {
            throw new Error(`Invalid date in selection: ${item.date}`);
          }
          return date;
        })
        .filter((date): date is Date => date !== null);

      if (selectedDates.length === 0) {
        console.warn("No valid dates selected for cancellation");
        return;
      }

      onSubmitCancelInstances(selectedDates);
      setIsOpenDialog(false);
    } catch (error) {
      console.error("Error in handleCancel:", error);
    }
  };

  if (futureDates.length === 0) {
    return (
      <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
        <DialogContent>
          <DialogHeader title="Cancel Instance" subtitle="No future instances available to cancel" />
          <DialogFooter>
            <DialogClose className="border">Close</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const renderCheckboxList = () => {
    const checkboxes = filteredFields.map((field) => {
      const originalIndex = fields.findIndex((f) => f.id === field.id);
      const formatted = dayjs(field.date)
        .tz(userTimeZone)
        .format(userTimeFormat === 24 ? "dddd, D MMM YYYY HH:mm" : "dddd, D MMM YYYY h:mm A");

      return (
        <FormField
          key={field.id}
          control={control}
          name={`instances.${originalIndex}.isSelected`}
          render={({ field: { value, onChange } }) => (
            <CheckboxField
              checked={value ?? false}
              description={formatted}
              onCheckedChange={(checked) => onChange(checked ?? false)}
            />
          )}
        />
      );
    });

    if (searchQuery && filteredFields.length === 0) {
      return (
        <div className="py-8 text-center text-sm text-gray-500">
          No instances found matching &quot;{searchQuery}&quot;
        </div>
      );
    }

    return <div className="space-y-2">{checkboxes}</div>;
  };

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent enableOverflow>
        <DialogHeader showIcon iconName="calendar-x-2" iconVariant="warning">
          <DialogTitle>{t("cancel_instance")}</DialogTitle>
          <DialogDescription>{t("cancel_instance_description")}</DialogDescription>
        </DialogHeader>

        <Form id="cancel-instances-form" form={form} onSubmit={handleCancel}>
          {shouldShowSearch && (
            <div className="mb-4">
              <div className="relative">
                <Icon
                  name="search"
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                />
                <Input
                  type="text"
                  placeholder="Search dates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Showing {filteredFields.length} of {fields.length} instances
              </p>
            </div>
          )}

          {shouldUseScrollArea ? (
            <ScrollArea className="h-[400px] pr-3">{renderCheckboxList()}</ScrollArea>
          ) : (
            renderCheckboxList()
          )}
        </Form>

        <DialogFooter>
          <DialogClose />
          <Button
            StartIcon="check"
            color="destructive"
            type="submit"
            form="cancel-instances-form"
            disabled={isSubmitDisabled}
            data-testid="delete-selected-instances">
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
