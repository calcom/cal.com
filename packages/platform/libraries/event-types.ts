export { createHandler as createEventType } from "@calcom/trpc/server/routers/viewer/eventTypes/create.handler";
export { updateHandler as updateEventType } from "@calcom/trpc/server/routers/viewer/eventTypes/update.handler";

export type { TUpdateInputSchema as TUpdateEventTypeInputSchema } from "@calcom/trpc/server/routers/viewer/eventTypes/update.schema";
export type { EventTypesPublic } from "@calcom/lib/event-types/getEventTypesPublic";
export { getEventTypesPublic } from "@calcom/lib/event-types/getEventTypesPublic";
export { parseEventTypeColor } from "@calcom/lib/isEventTypeColor";
export {
  // note(Lauris): Api to internal
  transformBookingFieldsApiToInternal,
  transformLocationsApiToInternal,
  transformTeamLocationsApiToInternal,
  transformIntervalLimitsApiToInternal,
  transformFutureBookingLimitsApiToInternal,
  transformRecurrenceApiToInternal,
  transformBookerLayoutsApiToInternal,
  transformConfirmationPolicyApiToInternal,
  transformEventColorsApiToInternal,
  transformSeatsApiToInternal,
  // note(Lauris): Internal to api
  transformBookingFieldsInternalToApi,
  transformLocationsInternalToApi,
  transformIntervalLimitsInternalToApi,
  transformFutureBookingLimitsInternalToApi,
  transformRecurrenceInternalToApi,
  transformBookerLayoutsInternalToApi,
  transformRequiresConfirmationInternalToApi,
  transformEventTypeColorsInternalToApi,
  transformSeatsInternalToApi,
  // note(Lauris): schemas
  InternalLocationsSchema,
  InternalLocationSchema,
  BookingFieldsSchema,
  BookingFieldSchema,
  // note(Lauris): constants
  systemBeforeFieldName,
  systemBeforeFieldEmail,
  systemBeforeFieldLocation,
  systemAfterFieldRescheduleReason,
  systemAfterFieldTitle,
  systemAfterFieldNotes,
  systemAfterFieldGuests,
} from "@calcom/lib/event-types/transformers";

export type {
  SystemField,
  CustomField,
  NameSystemField,
  EmailSystemField,
  InternalLocation,
} from "@calcom/lib/event-types/transformers";

export { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

export { validateCustomEventName } from "@calcom/lib/event";
