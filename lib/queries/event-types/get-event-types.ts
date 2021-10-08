import { EventType } from "@prisma/client";

import * as fetch from "@lib/core/http/fetch-wrapper";

type GetEventsResponse = { message: string; data: EventType[] };
const getEventTypes = async () => {
  const response = await fetch.get<GetEventsResponse>("/api/event-type");
  return response.data;
};

export default getEventTypes;
