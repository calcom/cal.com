import * as fetch from "@lib/core/http/fetch-wrapper";
import { CreateEventType } from "@lib/types/event-type";
import { EventType } from "@prisma/client";

const createEventType = async (data: CreateEventType) => {
  const response = await fetch.post<CreateEventType, EventType>("/api/availability/eventtype", data);
  return response;
};

export default createEventType;
