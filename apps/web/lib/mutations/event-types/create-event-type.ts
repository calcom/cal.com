import * as fetch from "@lib/core/http/fetch-wrapper";
import { CreateEventType, CreateEventTypeResponse } from "@lib/types/event-type";

/**
 * @deprecated Use `trpc.useMutation("viewer.eventTypes.create")` instead.
 */
const createEventType = async (data: CreateEventType) => {
  const response = await fetch.post<CreateEventType, CreateEventTypeResponse>(
    "/api/availability/eventtype",
    data
  );
  return response;
};

export default createEventType;
