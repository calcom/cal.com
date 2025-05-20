import { WorkflowTemplates } from "@calcom/prisma/enums";

export const getContentSidForTemplate = (template?: WorkflowTemplates): string | undefined => {
  if (!template) {
    return process.env.TWILIO_WHATSAPP_REMINDER_CONTENT_SID;
  }
  switch (template) {
    case WorkflowTemplates.REMINDER:
      return process.env.TWILIO_WHATSAPP_REMINDER_CONTENT_SID;
    case WorkflowTemplates.CANCELLED:
      return process.env.TWILIO_WHATSAPP_CANCELLED_CONTENT_SID;
    case WorkflowTemplates.RESCHEDULED:
      return process.env.TWILIO_WHATSAPP_RESCHEDULED_CONTENT_SID;
    case WorkflowTemplates.COMPLETED:
      return process.env.TWILIO_WHATSAPP_COMPLETED_CONTENT_SID;
    default:
      return process.env.TWILIO_WHATSAPP_REMINDER_CONTENT_SID;
  }
};

export const getContentVariablesForTemplate = (variables: {
  name?: string;
  attendeeName?: string;
  eventName?: string;
  eventDate?: string;
  startTime?: string;
  timeZone?: string;
}): Record<string, string> => {
  const { name, attendeeName, eventName, eventDate, startTime, timeZone } = variables;

  const commonVariables: Record<string, string> = {
    name: name || "",
    attendee: attendeeName || "",
    event_name: eventName || "",
    event_date: eventDate || "",
    start_time: startTime || "",
    timezone: timeZone || "",
  };

  return commonVariables;
};
