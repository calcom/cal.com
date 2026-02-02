import { useTroubleshooterStore } from "@calcom/features/troubleshooter/store";

import { CalendarViewPlatformWrapper } from "../../calendar-view/wrappers/CalendarViewPlatformWrapper";

export const LargeCalendar = (): JSX.Element | null => {
  const event = useTroubleshooterStore((state) => state.event);

  if (!event?.slug) return null;

  if (event.teamId) {
    return (
      <CalendarViewPlatformWrapper
        isEventTypeView={true}
        teamId={event.teamId}
        eventSlug={event.slug}
      />
    );
  }

  if (event.username) {
    return (
      <CalendarViewPlatformWrapper
        isEventTypeView={true}
        username={event.username}
        eventSlug={event.slug}
      />
    );
  }

  return null;
};
