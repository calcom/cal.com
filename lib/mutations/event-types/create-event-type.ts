import { CreateEventType } from "@lib/types/event-type";

const createEventType = async (data: CreateEventType) => {
  const response = await fetch("/api/availability/eventtype", {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
    },
  });

  const obj = await response.json();
  if (!response.ok) {
    throw new Error(obj.message);
  }

  return obj;
};

export default createEventType;
