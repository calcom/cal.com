import { getQueryParam } from "@calcom/features/bookings/Booker/utils/query-param";
import { useTroubleshooterStore } from "@calcom/features/troubleshooter/store";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SelectField } from "@calcom/ui/components/form";
import { startTransition, useEffect, useMemo } from "react";
import { shallow } from "zustand/shallow";

interface EventTypeItem {
  id: number;
  title: string;
  slug: string;
  length: number;
  username?: string | null;
  team?: {
    id: number;
    name: string;
  } | null;
}

interface EventTypeSelectComponentProps {
  eventTypes: EventTypeItem[];
  isPending?: boolean;
}

export function EventTypeSelectComponent({
  eventTypes,
  isPending,
}: EventTypeSelectComponentProps): JSX.Element {
  const { t } = useLocale();
  const { event: selectedEventType, setEvent: setSelectedEventType } =
    useTroubleshooterStore(
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
    const eventTypeId = selectedEventIdParam
      ? parseInt(selectedEventIdParam, 10)
      : null;

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
            username: foundEventType.username ?? null,
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
        username: firstEvent.username ?? null,
      });
    }
  }, [eventTypes, selectedEventType, setSelectedEventType]);

  return (
    <SelectField
      label={t("event_type")}
      options={options}
      isDisabled={isPending || options.length === 0}
      value={
        options.find((option) => option.id === selectedEventType?.id) ||
        options[0]
      }
      onChange={(option) => {
        if (!option) return;
        const foundEventType = eventTypes?.find((et) => et.id === option.id);
        if (foundEventType) {
          setSelectedEventType({
            id: foundEventType.id,
            slug: foundEventType.slug,
            duration: foundEventType.length,
            teamId: foundEventType.team?.id ?? null,
            username: foundEventType.username ?? null,
          });
        }
      }}
    />
  );
}
