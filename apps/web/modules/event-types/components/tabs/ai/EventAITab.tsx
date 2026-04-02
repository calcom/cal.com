import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
import AIEventController from "./AIEventController";

export const EventAITab = ({
  eventType,
  isTeamEvent,
}: Pick<EventTypeSetupProps, "eventType"> & { isTeamEvent: boolean }) => {
  return <AIEventController eventType={eventType} isTeamEvent={isTeamEvent} />;
};
