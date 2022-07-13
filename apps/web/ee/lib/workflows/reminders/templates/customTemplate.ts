export type DynamicVariablesType = {
  eventName?: string;
  organizerName?: string;
  attendeeName?: string;
  eventDate?: string;
  eventTime?: string;
  timeZone?: string;
};

const customTemplate = (text: string, dynamicVariables: DynamicVariablesType) => {
  const timeWithTimeZone = `${dynamicVariables.eventTime} (${dynamicVariables.timeZone})`;

  return text
    .replace("{EVENT_NAME}", dynamicVariables.eventName || "")
    .replace("{ORGANIZER_NAME}", dynamicVariables.organizerName || "")
    .replace("{ATTENDEE_NAME}", dynamicVariables.attendeeName || "")
    .replace("{EVENT_DATE}", dynamicVariables.eventDate || "")
    .replace("{EVENT_TIME}", timeWithTimeZone);
};

export default customTemplate;
