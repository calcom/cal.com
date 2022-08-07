import { EventTypeSetupInfered } from "pages/event-types/[type]";
import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import { Badge, Button, Tooltip } from "@calcom/ui/v2";
import { Label, TextField } from "@calcom/ui/v2/form/fields";

import DestinationCalendarSelector from "@components/DestinationCalendarSelector";

export const EventAdvancedTab = ({ eventType, team }: Pick<EventTypeSetupInfered, "eventType" | "team">) => {
  const connectedCalendarsQuery = trpc.useQuery(["viewer.connectedCalendars"]);
  const formMethods = useFormContext();
  const { t } = useLocale();
  const [showEventNameTip, setShowEventNameTip] = useState(false);
  return (
    <div className="flex flex-col space-y-2">
      {/**
       * Only display calendar selector if user has connected calendars AND if it's not
       * a team event. Since we don't have logic to handle each attende calendar (for now).
       * This will fallback to each user selected destination calendar.
       */}
      {!!connectedCalendarsQuery.data?.connectedCalendars.length && !team && (
        <div className="flex flex-col">
          <Label>{t("add_to_calendar")}</Label>
          <div className="w-full">
            <Controller
              control={formMethods.control}
              name="destinationCalendar"
              defaultValue={eventType.destinationCalendar || undefined}
              render={({ field: { onChange, value } }) => (
                <DestinationCalendarSelector
                  value={value ? value.externalId : undefined}
                  onChange={onChange}
                  hidePlaceholder
                />
              )}
            />
          </div>
          <p className="py-2 text-sm text-gray-600">{t("select_which_cal")}</p>
        </div>
      )}
      <div className="w-full">
        <TextField
          name="eventName"
          label={t("event_name")}
          type="text"
          placeholder={t("meeting_with_user")}
          defaultValue={eventType.eventName || ""}
          hint={
            <Tooltip content={t("help")} side="bottom">
              {/* Use important here to save creating an overide for this unique case within styling */}
              <Button
                type="button"
                StartIcon={Icon.FiInfo}
                size="icon"
                color="minimal"
                onClick={() => setShowEventNameTip((old) => !old)}
                className="!-mt-2 !-ml-2 hover:bg-transparent"
              />
            </Tooltip>
          }
        />
      </div>
      {showEventNameTip && (
        <div className="mt-1 text-gray-500">
          <p>{`{HOST} = ${t("your_name")}`}</p>
          <p>{`{ATTENDEE} = ${t("attendee_name")}`}</p>
          <p>{`{HOST/ATTENDEE} = ${t("dynamically_display_attendee_or_organizer")}`}</p>
          <p>{`{LOCATION} = ${t("event_location")}`}</p>
        </div>
      )}
    </div>
  );
};
