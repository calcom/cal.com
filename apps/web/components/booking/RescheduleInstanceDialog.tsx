import { generateRecurringInstances } from "@calid/features/modules/teams/lib/recurrenceUtil";
import { Icon } from "@calid/features/ui/components/icon/Icon";
import { Input } from "@calid/features/ui/components/input/input";
import { ScrollArea } from "@calid/features/ui/components/scroll-area";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc";
import type { RecurringEvent } from "@calcom/types/Calendar";
import { Button } from "@calcom/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/dialog";
import { CheckboxField } from "@calcom/ui/form/checkbox";

// Add timezone support
dayjs.extend(utc);
dayjs.extend(timezone);

type EventType = RouterOutputs["viewer"]["bookings"]["get"]["bookings"][number]["eventType"];

export type RescheduleInstanceDialogProps = {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  recurringEvent: RecurringEvent;
  eventStartTime: Date;
  eventType?: EventType;
  bookingUid?: string;
  userTimeZone: string;
  userTimeFormat: number | null;
};

interface RescheduleInstanceDate {
  date: string;
  isSelected: boolean;
  instanceIndex: number;
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
 * Dialog for selecting which instance of a recurring booking to reschedule.
 * After selection, redirects to the booking page with instance parameters.
 * Uses single-select checkboxes matching the CancelInstancesDialog UI.
 */
export function RescheduleInstanceDialog({
  isOpen,
  setIsOpen,
  recurringEvent,
  eventStartTime,
  eventType,
  bookingUid,
  userTimeZone,
  userTimeFormat,
}: RescheduleInstanceDialogProps) {
  const { t } = useLocale();
  const session = useSession();
  const router = useRouter();
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

  /**
   * Generate all instances using generateRecurringInstances utility
   */
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

  // Filter to only show future dates (that can be rescheduled)
  const futureDates = useMemo(() => {
    return allRecurringDates
      .filter((date) => {
        const validDate = validateDate(date);
        return validDate && validDate > now;
      })
      .sort((a, b) => a.getTime() - b.getTime())
      .map((date, index) => ({
        date: date.toISOString(),
        isSelected: false,
        instanceIndex: index,
      }));
  }, [allRecurringDates, now]);

  // Form setup
  const { control, handleSubmit, watch, setValue } = useForm<{ instances: RescheduleInstanceDate[] }>({
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

  // Handle single-select checkbox behavior (only one can be selected at a time)
  const handleCheckboxChange = (selectedIndex: number, currentValue: boolean) => {
    const newValue = !currentValue;

    // If selecting this checkbox, deselect all others
    if (newValue) {
      fields.forEach((_, index) => {
        setValue(`instances.${index}.isSelected`, index === selectedIndex);
      });
    } else {
      // Just deselect this one
      setValue(`instances.${selectedIndex}.isSelected`, false);
    }
  };

  // Handle reschedule action
  const handleReschedule = (data: { instances: RescheduleInstanceDate[] }) => {
    try {
      const selectedInstance = data.instances.find((item) => item.isSelected);

      if (!selectedInstance) {
        console.warn("No instance selected for rescheduling");
        return;
      }

      const instanceDate = validateDate(selectedInstance.date);
      if (!instanceDate) {
        throw new Error(`Invalid date in selection: ${selectedInstance.date}`);
      }

      // Build the reschedule URL with necessary parameters
      const params = new URLSearchParams();

      // Required: Booking UID for the recurring series
      params.set("rescheduleUid", bookingUid || "");

      // Required: Instance identification (ISO-formatted, URL-safe)
      params.set("rescheduleInstanceDate", instanceDate.toISOString());

      // Optional: User context
      if (session?.data?.user?.email) {
        params.set("rescheduledBy", session.data.user.email);
      }

      const queryString = params.toString();
      const rescheduleUrl = `/reschedule/${bookingUid}?${queryString}`;

      // Close the dialog
      setIsOpen(false);

      // Redirect to the reschedule page
      router.push(rescheduleUrl);
    } catch (error) {
      console.error("Error in handleReschedule:", error);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Show warning if no future dates available to reschedule
  if (futureDates.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader title="Reschedule Instance" subtitle="No future instances available to reschedule" />
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
          render={({ field: { value } }) => (
            <CheckboxField
              checked={value}
              description={formatted}
              onChange={() => handleCheckboxChange(originalIndex, value)}
            />
          )}
        />
      );
    });

    // Show a message when search returns no results
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
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent enableOverflow>
        <DialogHeader title="Reschedule Instance" subtitle="Select instance you want to reschedule" />

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
            onClick={handleSubmit(handleReschedule)}
            disabled={isSubmitDisabled}
            data-testid="reschedule-selected-instance">
            Reschedule Selected
          </Button>
          <DialogClose className="border">Close</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
