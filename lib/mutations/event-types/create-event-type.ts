import { CreateEventType } from "@lib/types/event-type";

const createEventType = async (data: CreateEventType) => {
  const response = await fetch("/api/availability/eventtype", {
    method: "POST",
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

export default createEventType;
