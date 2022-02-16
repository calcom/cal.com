import { EventType } from "@prisma/client";

import * as fetch from "@lib/core/http/fetch-wrapper";
import { EventTypeInput } from "@lib/types/event-type";

type EventTypeResponse = {
  eventType: EventType;
};

/**
 * @deprecated Use `trpc.useMutation("viewer.eventTypes.update")` instead.
 */
const updateEventType = async (data: EventTypeInput) => {
  const response = await fetch.patch<EventTypeInput, EventTypeResponse>("/api/availability/eventtype", data);
  return response;
};

export default updateEventType;
