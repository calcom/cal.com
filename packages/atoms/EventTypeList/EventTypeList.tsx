import { CreateFirstEventTypeView } from "EventTypeList/components/empty-screen/createFirstEventType";
import { EmptyEventTypeList } from "EventTypeList/components/empty-screen/emptyEventTypeList";

import type { RouterOutputs } from "@calcom/trpc";

type EventTypeGroups = RouterOutputs["viewer"]["eventTypes"]["getByViewer"]["eventTypeGroups"];

export type EventTypeGroup = EventTypeGroups[number];
export type EventType = EventTypeGroup["eventTypes"][number];

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

  return (
    <div>
      <h1>Event type list goes here</h1>
    </div>
  );
}
