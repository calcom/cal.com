import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
import { EventPrivacyTab } from "./EventPrivacyTab";

type EventPrivacyWebWrapperProps = {
  eventType: EventTypeSetupProps["eventType"];
  team: EventTypeSetupProps["team"];
};

const EventPrivacyWebWrapper = ({ eventType, team }: EventPrivacyWebWrapperProps) => {
  return <EventPrivacyTab eventType={eventType} team={team} />;
};

export default EventPrivacyWebWrapper;
