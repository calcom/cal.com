import { useApiKey } from "cal-provider";
import { CreateFirstEventTypeView } from "event-type-list/components/empty-screen/createFirstEventType";
import { EmptyEventTypeList } from "event-type-list/components/empty-screen/emptyEventTypeList";
import { useState, useEffect } from "react";

import type { RouterOutputs } from "@calcom/trpc";
import { trpc } from "@calcom/trpc/react";

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

  // missing props from event type component
  // moveEventType, onMutate, onCopy, onEdit, onDuplicate, onDelete, onPreview
  const utils = trpc.useContext();
  const mutation = trpc.viewer.eventTypeOrder.useMutation({
    onError: async (err) => {
      console.error(err.message);
      await utils.viewer.eventTypes.getByViewer.cancel();
      await utils.viewer.eventTypes.invalidate();
    },
    onSettled: () => {
      utils.viewer.eventTypes.invalidate();
    },
  });

  async function moveEventType(index: number, increment: 1 | -1) {
    const newList = [...types];

    const type = types[index];
    const tmp = types[index + increment];
    if (tmp) {
      newList[index] = tmp;
      newList[index + increment] = type;
    }

    await utils.viewer.eventTypes.getByViewer.cancel();

    const previousValue = utils.viewer.eventTypes.getByViewer.getData();
    if (previousValue) {
      utils.viewer.eventTypes.getByViewer.setData(undefined, {
        ...previousValue,
        eventTypeGroups: [
          ...previousValue.eventTypeGroups.slice(0, groupIndex),
          { ...group, eventTypes: newList },
          ...previousValue.eventTypeGroups.slice(groupIndex + 1),
        ],
      });
    }

    mutation.mutate({
      ids: newList.map((type) => type.id),
    });
  }

  const setHiddenMutation = trpc.viewer.eventTypes.update.useMutation({
    onMutate: async ({ id }) => {
      await utils.viewer.eventTypes.getByViewer.cancel();
      const previousValue = utils.viewer.eventTypes.getByViewer.getData();

      if (previousValue) {
        const newList = [...types];
        const itemIndex = newList.findIndex((item) => item.id === id);
        if (itemIndex !== -1 && newList[itemIndex]) {
          newList[itemIndex].hidden = !newList[itemIndex].hidden;
        }
        utils.viewer.eventTypes.getByViewer.setData(undefined, {
          ...previousValue,
          eventTypeGroups: [
            ...previousValue.eventTypeGroups.slice(0, groupIndex),
            { ...group, eventTypes: newList },
            ...previousValue.eventTypeGroups.slice(groupIndex + 1),
          ],
        });
      }

      return { previousValue };
    },
    onError: async (err, _, context) => {
      if (context?.previousValue) {
        utils.viewer.eventTypes.getByViewer.setData(undefined, context.previousValue);
      }
      console.error(err.message);
    },
    onSettled: () => {
      utils.viewer.eventTypes.invalidate();
    },
  });

  useEffect(() => {
    async function getEventTypes(key: string) {
      // here we're supposed call the /event-types endpoint in v2 to get event types
      // since v2 is not ready yet thats why calling localhost for now
      const response = await fetch(`/v2/event-types?apiKey=${key}`);
      const data = await response.json();

      setEventTypeGroup(data);
    }

    if (key !== "no_key" && key !== "invalid_key") {
      setIsKeyPresent(true);
      getEventTypes(key);
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
