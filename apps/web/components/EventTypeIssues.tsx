import React from "react";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { inferQueryOutput } from "@calcom/trpc/react";
import { Button, Popover } from "@calcom/ui";
import { Icon } from "@calcom/ui/Icon";
import { PopoverContent, PopoverTrigger } from "@calcom/ui/Popover";

type EventTypeGroup = inferQueryOutput<"viewer.eventTypes">["eventTypeGroups"][number];
type ConnectedCalendars = inferQueryOutput<"viewer.connectedCalendars">["connectedCalendars"][number];
type EventType = EventTypeGroup["eventTypes"][number];

interface Props {
  type: EventType;
  flatConnectedCalendars: ConnectedCalendars[] | undefined;
}

const EventTypesIssues = ({ type, flatConnectedCalendars }: Props): JSX.Element | null => {
  const { t } = useLocale();

  const errors = [];
  const missingConnectedCalendar = flatConnectedCalendars?.length && !type.team && !!type.destinationCalendar;
  missingConnectedCalendar ? errors.push(t("missing_connected_calendar")) : null;

  if (errors.length) {
    return (
      <div>
        <Popover>
          <PopoverTrigger>
            <Button
              type="button"
              size="icon"
              color="alert"
              className={classNames(type.$disabled && " opacity-30")}
              StartIcon={Icon.Flag}
            />
          </PopoverTrigger>
          <PopoverContent>
            <ul>
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      </div>
    );
  }
  return null;
};

export default EventTypesIssues;
