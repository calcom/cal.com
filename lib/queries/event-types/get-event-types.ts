import * as fetch from "@lib/core/http/fetch-wrapper";
import { EventType } from "@prisma/client";

type GetEventsResponse = { message: string; data: EventType[] };
const getEventTypes = async () => {
  const response = await fetch.get<GetEventsResponse>("/api/event-type");
  return response.data;
};

export default getEventTypes;
