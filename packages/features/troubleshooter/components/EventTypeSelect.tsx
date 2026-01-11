import { useMemo, useEffect, startTransition } from "react";
import { shallow } from "zustand/shallow";

import { trpc } from "@calcom/trpc";
import { SelectField } from "@calcom/ui/components/form";

import { getQueryParam } from "../../bookings/Booker/utils/query-param";
import { useTroubleshooterStore } from "../store";

export function EventTypeSelect() {
  const { data: eventTypes, isPending } = trpc.viewer.eventTypes.listWithTeam.useQuery();
  const { event: selectedEventType, setEvent: setSelectedEventType } = useTroubleshooterStore(
    (state) => ({
      event: state.event,
      setEvent: state.setEvent,
    }),
    shallow
  );

  const options = useMemo(() => {
    if (!eventTypes) return [];
    return eventTypes.map((e) => ({
      label: e.title,
      value: e.id.toString(),
      id: e.id,
      duration: e.length,
    }));
  }, [eventTypes]);

  // Initialize event type from query param or default to first event
  useEffect(() => {
    if (!eventTypes || eventTypes.length === 0) return;

    const selectedEventIdParam = getQueryParam("eventTypeId");
    const eventTypeId = selectedEventIdParam ? parseInt(selectedEventIdParam, 10) : null;

    // If we already have a selected event that matches the query param, don't do anything
    if (selectedEventType?.id === eventTypeId) return;

    // If there's a query param, try to find and set that event
    if (eventTypeId && !isNaN(eventTypeId)) {
      startTransition(() => {
        const foundEventType = eventTypes.find((et) => et.id === eventTypeId);
        if (foundEventType) {
          setSelectedEventType({
            id: foundEventType.id,
            slug: foundEventType.slug,
            duration: foundEventType.length,
            teamId: foundEventType.team?.id ?? null,
          });
          return;
        }
      });
    }

    // If no event is selected and no valid query param, default to first event
    if (!selectedEventType && !eventTypeId) {
      const firstEvent = eventTypes[0];
      setSelectedEventType({
        id: firstEvent.id,
        slug: firstEvent.slug,
        duration: firstEvent.length,
        teamId: firstEvent.team?.id ?? null,
      });
    }
  }, [eventTypes, selectedEventType, setSelectedEventType]);

  return (
    <SelectField
      label="Event Type"
      options={options}
      isDisabled={isPending || options.length === 0}
      value={options.find((option) => option.id === selectedEventType?.id) || options[0]}
      onChange={(option) => {
        if (!option) return;
        const foundEventType = eventTypes?.find((et) => et.id === option.id);
        if (foundEventType) {
          setSelectedEventType({
            id: foundEventType.id,
            slug: foundEventType.slug,
            duration: foundEventType.length,
            teamId: foundEventType.team?.id ?? null,
          });
        }
      }}
    />
  );
}
