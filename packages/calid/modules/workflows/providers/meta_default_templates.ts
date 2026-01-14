import {  WorkflowTemplates } from "@calcom/prisma/enums";

export const defaultTemplateNamesMap = (
  templateName: WorkflowTemplates,
  target: "attendee" | "organizer"
) => {
  return `${target}_${templateName.toLowerCase()}`;
};

export const defaultTemplateComponentsMap = (
  templateName: WorkflowTemplates,
  target: "attendee" | "organizer"
) => {
  switch (templateName) {
    case WorkflowTemplates.REMINDER:
      return {
        components: [
          {
            text: `Hi {{${target}_name}}, this is a reminder that your meeting ({{event_name}}) is on {{event_time}} {{timezone}}. Thanks.`,
            type: "BODY",
            example: {
              body_text_named_params: [
                {
                  example: "John",
                  param_name: `${target}_name`,
                },
                {
                  example: "Chat",
                  param_name: "event_name",
                },
                {
                  example: "Thu, 3 Dec, 3 PM",
                  param_name: "event_time",
                },

                {
                  example: "Asia/Kolkata",
                  param_name: "timezone",
                },
              ],
            },
          },
        ],
        sub_category: "CUSTOM",
        parameter_format: "NAMED",
      };
    case WorkflowTemplates.CANCELLED:
      return {
        components: [
          {
            text: `Hi {{${target}_name}}, your scheduled meeting ({{event_name}}) on {{event_time}} {{timezone}} has now been officially cancelled.`,
            type: "BODY",
            example: {
              body_text_named_params: [
                {
                  example: "John",
                  param_name: `${target}_name`,
                },
                {
                  example: "Chat",
                  param_name: "event_name",
                },
                {
                  example: "Thu, 3 Dec, 3 PM",
                  param_name: "event_time",
                },
                {
                  example: "Asia/Kolkata",
                  param_name: "timezone",
                },
              ],
            },
          },
        ],
        sub_category: "CUSTOM",
        parameter_format: "NAMED",
      };
    case WorkflowTemplates.RESCHEDULED:
      return {
        components: [
          {
            text: `Hi {{${target}_name}}, your meeting ({{event_name}}) has been rescheduled successfully to {{event_time}} {{timezone}} as of now.`,
            type: "BODY",
            example: {
              body_text_named_params: [
                {
                  example: "John",
                  param_name: `${target}_name`,
                },
                {
                  example: "Chat",
                  param_name: "event_name",
                },
                {
                  example: "Thu, 3 Dec, 3 PM",
                  param_name: "event_time",
                },
                {
                  example: "Asia/Kolkata",
                  param_name: "timezone",
                },
              ],
            },
          },
        ],
        sub_category: "CUSTOM",
        parameter_format: "NAMED",
      };
    case WorkflowTemplates.COMPLETED:
      return {
        components: [
          {
            text: `Hi {{${target}_name}}, Your event ({{event_name}}) on {{event_time}} {{timezone}} has been completed. Thank you for attending`,
            type: "BODY",
            example: {
              body_text_named_params: [
                {
                  example: "John",
                  param_name: `${target}_name`,
                },
                {
                  example: "Chat",
                  param_name: "event_name",
                },
                {
                  example: "Thu, 3 Dec, 3 PM",
                  param_name: "event_time",
                },
                {
                  example: "Asia/Kolkata",
                  param_name: "timezone",
                },
              ],
            },
          },
        ],
        sub_category: "CUSTOM",
        parameter_format: "NAMED",
      };
    default:
      throw new Error(`Unsupported workflow template: ${templateName}`);
  }
};
