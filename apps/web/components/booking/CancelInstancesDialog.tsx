import { generateRecurringInstances } from "@calid/features/modules/teams/lib/recurrenceUtil";
import { Icon } from "@calid/features/ui/components/icon/Icon";
import { Input } from "@calid/features/ui/components/input/input";
import { ScrollArea } from "@calid/features/ui/components/scroll-area";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import type { RecurringEvent } from "@calcom/types/Calendar";
import { Button } from "@calcom/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/dialog";
import { CheckboxField } from "@calcom/ui/form/checkbox";

// Add timezone support
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

/**
 * Validate and sanitize date input
 */
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

/**
 * CancelInstancesDialog Component
 *
 * Allows users to select and cancel specific instances of a recurring booking.
 * The backend will handle merging the selected dates with existing exDates.
 */
export const CancelInstancesDialog = ({
  isOpenDialog,
  setIsOpenDialog,
  bookingUid,
  recurringEvent, // NEW: Structured object instead of string pattern
  eventStartTime,
  userTimeZone,
  userTimeFormat,
  onSubmitCancelInstances, // NEW: Only receives selectedDates
}: CancelInstancesDialogProps) => {
  const now = useMemo(() => new Date(), []);
  const [searchQuery, setSearchQuery] = useState("");

  // Validate event start time
  const validatedEventStartTime = useMemo(() => {
    const validDate = validateDate(eventStartTime);
    if (!validDate) {
      console.error("Invalid eventStartTime provided:", eventStartTime);
      return new Date(); // Fallback to current date
    }
    return validDate;
  }, [eventStartTime]);

  // NEW: Generate all recurring dates from recurringEvent object
  // This uses the same logic as the backend to ensure consistency
  const allRecurringDates = useMemo(() => {
    if (!recurringEvent || typeof recurringEvent.freq === "undefined") {
      console.warn("No valid recurringEvent provided");
      return [];
    }
    console.log(
      "Generating recurring instances for:",
      JSON.stringify(recurringEvent),
      validatedEventStartTime
    );
    return generateRecurringInstances(recurringEvent, validatedEventStartTime);
  }, [recurringEvent, validatedEventStartTime]);

  // Filter to only show future dates (that can be cancelled)
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

  // Form setup
  const { control, handleSubmit, watch } = useForm<{ instances: CancelInstanceDate[] }>({
    defaultValues: { instances: futureDates },
    mode: "onBlur",
  });

  const watchedInstances = watch("instances");
  const isSubmitDisabled = !watchedInstances?.some((instance) => instance.isSelected);

  const { fields } = useFieldArray({ control, name: "instances" });

  // Filter fields based on search query
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

  // Determine if we should show search and use scrollable area
  const shouldShowSearch = futureDates.length > 10;
  const shouldUseScrollArea = futureDates.length > 10;

  // NEW: Simplified submit handler - only sends selectedDates
  // Backend will handle merging with existing exDates internally
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

      // NEW: Only send selectedDates
      // Backend will generate updated exDates by merging existing recurringEvent.exDates
      // with the newly selected dates
      onSubmitCancelInstances(selectedDates);
      setIsOpenDialog(false);
    } catch (error) {
      console.error("Error in handleCancel:", error);
    }
  };

  // Show warning if no future dates available to cancel
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
    const checkboxes = filteredFields.map((field, index) => {
      const originalIndex = fields.findIndex((f) => f.id === field.id);
      const formatted = dayjs(field.date)
        .tz(userTimeZone)
        .format(userTimeFormat === 24 ? "dddd, D MMM YYYY HH:mm" : "dddd, D MMM YYYY h:mm A");

      return (
        <Controller
          key={field.id}
          name={`instances.${originalIndex}.isSelected`}
          control={control}
          render={({ field: { onChange, value } }) => (
            <CheckboxField checked={value} description={formatted} onChange={() => onChange(!value)} />
          )}
        />
      );
    });

    // Show a message when search returns no results
    if (searchQuery && filteredFields.length === 0) {
      return (
        <div className="py-8 text-center text-sm text-gray-500">
          No instances found matching "{searchQuery}"
        </div>
      );
    }

    return <div className="space-y-2">{checkboxes}</div>;
  };

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent enableOverflow>
        <DialogHeader title="Cancel Instance" subtitle="Select instances you want to cancel" />

        <form>
          {/* Search field - only show if list is long */}
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

          {/* Checkbox list - use ScrollArea if list is long */}
          {shouldUseScrollArea ? (
            <ScrollArea className="h-[400px] pr-3">{renderCheckboxList()}</ScrollArea>
          ) : (
            renderCheckboxList()
          )}
        </form>

        <DialogFooter>
          <Button
            onClick={handleSubmit(handleCancel)}
            disabled={isSubmitDisabled}
            data-testid="delete-selected-instances">
            Delete Selected
          </Button>
          <DialogClose className="border">Close</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
