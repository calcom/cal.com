const createEventType = async (body: any) => {
  // TODO: Add validation
  const response = await fetch("/api/availability/eventtype", {
    method: "POST",
    body: body,
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
