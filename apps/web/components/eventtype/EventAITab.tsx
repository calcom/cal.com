import type { EventTypeSetupProps } from "pages/event-types/[type]";

import AIEventController from "./AIEventController";

export const EventAITab = ({
  eventType,
  isTeamEvent,
}: Pick<EventTypeSetupProps, "eventType"> & { isTeamEvent: boolean }) => {
  return <AIEventController eventType={eventType} isTeamEvent={isTeamEvent} />;
};
