export function getEventName(
  name: string | string[] | undefined,
  eventTitle: string,
  eventNameTemplate: string | null
) {
  if (!name || !(typeof name === "string")) name = ""; // If name is not set or is not of proper type
  return eventNameTemplate ? eventNameTemplate.replace("{USER}", name) : eventTitle + " with " + name;
}
