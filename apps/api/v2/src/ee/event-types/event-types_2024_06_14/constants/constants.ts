import { OrganizerIntegrationLocation } from "@/ee/event-types/event-types_2024_06_14/transformers";

type BaseEventType = {
  length: number;
  slug: string;
  title: string;
};

type EventTypeWithLocation = BaseEventType & {
  locations: OrganizerIntegrationLocation[];
};

const thirtyMinutes: BaseEventType = {
  length: 30,
  slug: "thirty-minutes",
  title: "30 Minutes",
};

const thirtyMinutesVideo: EventTypeWithLocation = {
  length: 30,
  slug: "thirty-minutes-video",
  title: "30 Minutes",
  locations: [{ type: "integrations:daily" }],
};

const sixtyMinutes: BaseEventType = {
  length: 60,
  slug: "sixty-minutes",
  title: "60 Minutes",
};

const sixtyMinutesVideo: EventTypeWithLocation = {
  length: 60,
  slug: "sixty-minutes-video",
  title: "60 Minutes",
  locations: [{ type: "integrations:daily" }],
};

export const DEFAULT_EVENT_TYPES = {
  thirtyMinutes,
  thirtyMinutesVideo,
  sixtyMinutes,
  sixtyMinutesVideo,
};
