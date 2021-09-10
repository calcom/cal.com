import * as fetch from "@lib/core/http/fetch-wrapper";
import { EventTypeInput } from "@lib/types/event-type";
import { EventType } from "@prisma/client";

const updateEventType = async (data: EventTypeInput) => {
  const response = await fetch.patch<EventTypeInput, EventType>("/api/availability/eventtype", data);
  return response;
};

export default updateEventType;
