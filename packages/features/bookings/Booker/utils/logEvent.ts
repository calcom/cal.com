// Consider making it an hook, that would retrieve useful data from useBookerStore and send along with the event
export const logEvent = (eventName: string, data: Record<string, unknown>) => {
  fetch("/api/log", {
    method: "POST",
    body: JSON.stringify({ eventName, data }),
  });
};
