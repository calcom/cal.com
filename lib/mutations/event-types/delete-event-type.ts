import * as fetch from "@lib/core/api/fetch-wrapper";

const deleteEventType = async (data: { id: number }) => {
  const response = await fetch.remove<{ id: number }, Record<string, never>>(
    "/api/availability/eventtype",
    data
  );
  return response;
};

export default deleteEventType;
