import { useMemo, useEffect } from "react";

import { trpc } from "@calcom/trpc";
import { SelectField } from "@calcom/ui";

import { getQueryParam } from "../../bookings/Booker/utils/query-param";
import { useTroubleshooterStore } from "../store";

export function EventTypeSelect() {
  const { data: eventTypes } = trpc.viewer.eventTypes.list.useQuery();
  const selectedEventType = useTroubleshooterStore((state) => state.eventSlug);
  const setSelectedEventType = useTroubleshooterStore((state) => state.setEventSlug);

  const selectedEventQueryParam = getQueryParam("eventType");

  const options = useMemo(() => {
    if (!eventTypes) return [];
    return eventTypes.map((e) => ({
      label: e.title,
      value: e.slug,
    }));
  }, [eventTypes]);

  useEffect(() => {
    if (selectedEventQueryParam !== selectedEventType && selectedEventQueryParam) {
      setSelectedEventType(selectedEventQueryParam);
    }
  }, [selectedEventQueryParam, selectedEventType, setSelectedEventType]);

  return (
    <SelectField
      label="Event Type"
      options={options}
      value={options.find((option) => option.value === selectedEventType) || options[0]}
      onChange={(option) => {
        if (!option) return;
        setSelectedEventType(option.value);
      }}
    />
  );
}
