import { EventTypeInput } from "@lib/types/event-type";

const updateEventType = async (data: EventTypeInput) => {
  const response = await fetch("/api/availability/eventtype", {
    method: "PATCH",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  return response.json();
};

export default updateEventType;
