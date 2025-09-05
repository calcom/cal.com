import EventManager from "@calcom/lib/EventManager";

export { getPublicEvent, type PublicEventType } from "@calcom/features/eventtypes/lib/getPublicEvent";
export { validateCustomEventName } from "@calcom/lib/event";
export { getBulkTeamEventTypes, getBulkUserEventTypes } from "@calcom/lib/event-types/getBulkEventTypes";
export type { EventTypesPublic } from "@calcom/lib/event-types/getEventTypesPublic";
export { getEventTypesPublic } from "@calcom/lib/event-types/getEventTypesPublic";
export { parseEventTypeColor } from "@calcom/lib/isEventTypeColor";
export {
  EventTypeMetaDataSchema,
  eventTypeBookingFields,
  eventTypeLocations,
} from "@calcom/prisma/zod-utils";
export { createHandler as createEventType } from "@calcom/trpc/server/routers/viewer/eventTypes/create.handler";
export { updateHandler as updateEventType } from "@calcom/trpc/server/routers/viewer/eventTypes/update.handler";
export type { TUpdateInputSchema as TUpdateEventTypeInputSchema } from "@calcom/trpc/server/routers/viewer/eventTypes/update.schema";
export { EventManager };

export { bulkUpdateEventsToDefaultLocation } from "@calcom/lib/bulkUpdateEventsToDefaultLocation";
export { bulkUpdateTeamEventsToDefaultLocation } from "@calcom/lib/bulkUpdateTeamEventsToDefaultLocation";
export type { EventType } from "@calcom/lib/event-types/getEventTypeById";
export { getEventTypeById } from "@calcom/lib/event-types/getEventTypeById";
export type { EventTypesByViewer } from "@calcom/lib/event-types/getEventTypesByViewer";
export { getEventTypesByViewer } from "@calcom/lib/event-types/getEventTypesByViewer";
export { updateNewTeamMemberEventTypes } from "@calcom/lib/server/queries/teams";
export type { UpdateEventTypeReturn } from "@calcom/trpc/server/routers/viewer/eventTypes/update.handler";
