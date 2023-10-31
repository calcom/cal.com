import { CreateFirstEventTypeView } from "EventTypeList/components/empty-screen/createFirstEventType";
import { EmptyEventTypeList } from "EventTypeList/components/empty-screen/emptyEventTypeList";

export function EventTypeList({
  group,
  groupIndex,
  readOnly,
  types,
}: {
  group: any;
  groupIndex: number;
  readOnly: boolean;
  types: any;
}): JSX.Element {
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
