import { CreateFirstEventTypeView } from "event-type-list/components/empty-screen/createFirstEventType";
import { EmptyEventTypeList } from "event-type-list/components/empty-screen/emptyEventTypeList";

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
  if (!types.length) {
    return group.teamId ? (
      <EmptyEventTypeList group={group} />
    ) : (
      <CreateFirstEventTypeView slug={group.profile.slug ?? ""} />
    );
  }

  const firstItem = types[0];
  const lastItem = types[types.length - 1];

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
