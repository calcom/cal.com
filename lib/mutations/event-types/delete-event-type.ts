const deleteEventType = async (data: { id: number }) => {
  const response = await fetch("/api/availability/eventtype", {
    method: "DELETE",
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

export default deleteEventType;
