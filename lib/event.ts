export function getEventName(name: string, eventTitle: string, eventNameTemplate?: string) {
  return eventNameTemplate ? eventNameTemplate.replace("{USER}", name) : eventTitle + " with " + name;
}
