import { useMemo, useEffect, startTransition } from "react";

import { trpc } from "@calcom/trpc";
import { SelectField } from "@calcom/ui";

import { getQueryParam } from "../../bookings/Booker/utils/query-param";
import { useTroubleshooterStore } from "../store";

export function EventTypeSelect() {
  const { data: eventTypes, isLoading } = trpc.viewer.eventTypes.list.useQuery();
  const selectedEventType = useTroubleshooterStore((state) => state.event);
  const setSelectedEventType = useTroubleshooterStore((state) => state.setEvent);

  const selectedEventQueryParam = getQueryParam("eventType");

  const options = useMemo(() => {
    if (!eventTypes) return [];
    return eventTypes.map((e) => ({
      label: e.title,
      value: e.slug,
      id: e.id,
      duration: e.length,
    }));
  }, [eventTypes]);

  useEffect(() => {
    if (!selectedEventType && eventTypes && eventTypes[0] && !selectedEventQueryParam) {
      const { id, slug, length } = eventTypes[0];
      setSelectedEventType({
        id,
        slug,
        duration: length,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventTypes]);

  useEffect(() => {
    if (selectedEventQueryParam) {
      // ensure that the update is deferred until the Suspense boundary has finished hydrating
      startTransition(() => {
        const foundEventType = eventTypes?.find((et) => et.slug === selectedEventQueryParam);
        if (foundEventType) {
          const { id, slug, length } = foundEventType;
          setSelectedEventType({ id, slug, duration: length });
        } else if (eventTypes && eventTypes[0]) {
          const { id, slug, length } = eventTypes[0];
          setSelectedEventType({
            id,
            slug,
            duration: length,
          });
        }
      });
    }
  }, [eventTypes, selectedEventQueryParam, setSelectedEventType]);

  return (
    <SelectField
      label="Event Type"
      options={options}
      isDisabled={isLoading || options.length === 0}
      value={options.find((option) => option.value === selectedEventType?.slug) || options[0]}
      onChange={(option) => {
        if (!option) return;
        setSelectedEventType({
          slug: option.value,
          id: option.id,
          duration: option.duration,
        });
      }}
    />
  );
}
