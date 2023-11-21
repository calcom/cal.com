import { useApiKey } from "cal-provider";
import { CreateFirstEventTypeView } from "event-type-list/components/empty-screen/createFirstEventType";
import { EmptyEventTypeList } from "event-type-list/components/empty-screen/emptyEventTypeList";
import { useState, useEffect } from "react";

import type { RouterOutputs } from "@calcom/trpc";

import { EventType } from "./components/event-type/index";

type EventTypeGroups = RouterOutputs["viewer"]["eventTypes"]["getByViewer"]["eventTypeGroups"];

export type EventTypeGroup = EventTypeGroups[number];
type EventType = EventTypeGroup["eventTypes"][number];

type EventTypeListProps = {
  group: EventTypeGroup;
  groupIndex: number;
  readOnly: boolean;
  types: EventType[];
};

export function EventTypeList({ group, groupIndex, readOnly, types }: EventTypeListProps): JSX.Element {
  const key = useApiKey();
  const [isKeyPresent, setIsKeyPresent] = useState(false);
  const [eventTypeGroup, setEventTypeGroup] = useState<EventTypeGroup>();

  useEffect(() => {
    async function getEventTypes(key: string) {
      // here we're supposed call the /event-types endpoint in v2 to get event types
      // since v2 is not ready yet thats why calling localhost for now
      const response = await fetch(`/v2/event-types?apiKey=${key}`);
      const data = await response.json();

      setEventTypeGroup(data);

      if (key !== "no_key" && key !== "invalid_key") {
        setIsKeyPresent(true);
        getEventTypes(key);
      }
    }
  }, [key]);

  if (key === "no_key") {
    return <>You havent entered a key</>;
  }

  if (key === "invalid_key") {
    return <>This is not a valid key, please enter a valid key</>;
  }

  if (isKeyPresent && !types.length) {
    return group.teamId ? (
      <EmptyEventTypeList group={group} />
    ) : (
      <CreateFirstEventTypeView slug={group.profile.slug ?? ""} />
    );
  }

  const firstItem = types[0];
  const lastItem = types[types.length - 1];

  if (isKeyPresent && !!types) {
    return (
      <div className="bg-default border-subtle mb-16 flex overflow-hidden rounded-md border">
        <ul className="divide-subtle !static w-full divide-y" data-testid="event-types">
          {types.map((type, index) => {
            return (
              <EventType
                key={type.id}
                index={index}
                group={group}
                type={type}
                readOnly={readOnly}
                firstItem={firstItem}
                lastItem={lastItem}
              />
            );
          })}
        </ul>
      </div>
    );
  }
}
