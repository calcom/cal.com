export function getEventName(
  name: string | string[] | undefined,
  eventTitle: string,
  eventNameTemplate: string | null,
  host?: string | undefined
) {
  if (!name || !(typeof name === "string")) name = ""; // If name is not set or is not of proper type
  return eventNameTemplate
    ? eventNameTemplate.replace("{USER}", name)
    : eventTitle + " between " + host + " and " + name;
}
