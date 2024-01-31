import { Edit } from "lucide-react";
import { Controller } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";

import DestinationCalendarSelector from "@calcom/features/calendars/DestinationCalendarSelector";
import { Label, TextField, Button } from "@calcom/ui";

import type { EventTypeSetupProps } from "../../tabs/event-setup/index";
import type { FormValues } from "../../types";

type EventCalendarViewProps = {
  team: Pick<EventTypeSetupProps, "eventType" | "team">;
  userConnectedCalendars: [];
  formMethods: UseFormReturn<FormValues, any, undefined>;
  destinationCalendarValue: {
    id: number;
    userId: number | null;
    eventTypeId: number | null;
    externalId: string;
    integration: string;
    credentialId: number | null;
  } | null;
  eventNamePlaceholder: string;
  eventNameDefaultValue: string;
  shouldLockDisableProps: (fieldName: string) => {
    disabled: boolean;
    LockedIcon: false | JSX.Element;
  };
  handleClick: () => void;
};

export function EventCalendarView({
  team,
  userConnectedCalendars,
  formMethods,
  destinationCalendarValue,
  eventNamePlaceholder,
  eventNameDefaultValue,
  shouldLockDisableProps,
  handleClick,
}: EventCalendarViewProps) {
  return (
    <div className="border-subtle space-y-6 rounded-lg border p-6">
      {!!userConnectedCalendars.length && !team && (
        <div className="flex flex-col">
          <div className="flex justify-between">
            <div>
              <Label className="text-emphasis mb-0 font-medium">Add to calendar</Label>
            </div>
            <a
              href="/apps/categories/calendar"
              target="_blank"
              className="hover:text-emphasis text-default text-sm">
              Add another calendar
            </a>
          </div>
          <Controller
            control={formMethods.control}
            name="destinationCalendar"
            defaultValue={destinationCalendarValue || undefined}
            render={({ field: { onChange, value } }) => (
              <DestinationCalendarSelector
                destinationCalendar={destinationCalendarValue}
                value={value ? value.externalId : undefined}
                onChange={onChange}
                hidePlaceholder
                hideAdvancedText
              />
            )}
          />
          <p className="text-subtle text-sm">Select which calendar to add bookings to</p>
        </div>
      )}
      <div className="w-full">
        <TextField
          label="Event name in calendar"
          type="text"
          {...shouldLockDisableProps("eventName")}
          placeholder={eventNamePlaceholder}
          defaultValue={eventNameDefaultValue || ""}
          {...formMethods.register("eventName")}
          addOnSuffix={
            <Button
              color="minimal"
              size="sm"
              aria-label="edit custom name"
              className="hover:stroke-3 hover:text-emphasis min-w-fit !py-0 px-0 hover:bg-transparent"
              onClick={handleClick}>
              <Edit className="h-4 w-4" />
            </Button>
          }
        />
      </div>
    </div>
  );
}
