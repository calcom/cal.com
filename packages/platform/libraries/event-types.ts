import EventManager from "@calcom/features/bookings/lib/EventManager";

export { getPublicEvent, type PublicEventType } from "@calcom/features/eventtypes/lib/getPublicEvent";

export { getBulkUserEventTypes, getBulkTeamEventTypes } from "@calcom/app-store/_utils/getBulkEventTypes";

export { createHandler as createEventType } from "@calcom/trpc/server/routers/viewer/eventTypes/heavy/create.handler";
export { updateHandler as updateEventType } from "@calcom/trpc/server/routers/viewer/eventTypes/heavy/update.handler";

export type { TUpdateInputSchema as TUpdateEventTypeInputSchema } from "@calcom/trpc/server/routers/viewer/eventTypes/heavy/update.schema";
export type { EventTypesPublic } from "@calcom/features/eventtypes/lib/getEventTypesPublic";
export { getEventTypesPublic } from "@calcom/features/eventtypes/lib/getEventTypesPublic";
export { parseEventTypeColor } from "@calcom/lib/isEventTypeColor";

export {
  EventTypeMetaDataSchema,
  eventTypeBookingFields,
  eventTypeLocations,
} from "@calcom/prisma/zod-utils";

export type { EventTypeMetadata } from "@calcom/prisma/zod-utils";

export { validateCustomEventName } from "@calcom/features/eventtypes/lib/eventNaming";
export { EventManager };
export { getEventTypeById } from "@calcom/features/eventtypes/lib/getEventTypeById";
export { getEventTypesByViewer } from "@calcom/features/eventtypes/lib/getEventTypesByViewer";
export type { EventType } from "@calcom/features/eventtypes/lib/getEventTypeById";
export type { EventTypesByViewer } from "@calcom/features/eventtypes/lib/getEventTypesByViewer";
export type { UpdateEventTypeReturn } from "@calcom/trpc/server/routers/viewer/eventTypes/heavy/update.handler";
export { updateNewTeamMemberEventTypes } from "@calcom/features/ee/teams/lib/queries";

export { bulkUpdateEventsToDefaultLocation } from "@calcom/app-store/_utils/bulkUpdateEventsToDefaultLocation";
export { bulkUpdateTeamEventsToDefaultLocation } from "@calcom/app-store/_utils/bulkUpdateTeamEventsToDefaultLocation";
