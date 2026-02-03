import { WorkflowTemplates } from "@calcom/prisma/enums";

export const defaultTemplateNamesMap = (
  templateName: WorkflowTemplates,
) => {
  return `${templateName.toLowerCase()}`;
};

export const defaultTemplateComponentsMap = (
  templateName: WorkflowTemplates,
) => {
  switch (templateName) {
    case WorkflowTemplates.REMINDER:
      return {
        components: [
          {
            text: "{{event_type_name}} — Reminder",
            type: "HEADER",
            format: "TEXT",
            example: {
              header_text_named_params: [
                {
                  example: "Quick Chat",
                  param_name: "event_type_name",
                },
              ],
            },
          },
          {
            text: 'Hi {{recipient_name}} — Just a heads-up, your meeting "{{event_type_name}}" with {{sender_name}} is coming up on {{event_date}} at {{event_time_formatted}}. See you then!',
            type: "BODY",
            example: {
              body_text_named_params: [
                {
                  example: "Manas",
                  param_name: "recipient_name",
                },
                {
                  example: "Quick Chat",
                  param_name: "event_type_name",
                },
                {
                  example: "Rohit",
                  param_name: "sender_name",
                },
                {
                  example: "24 Jan 2026",
                  param_name: "event_date",
                },
                {
                  example: "3:00am GMT+5:30",
                  param_name: "event_time_formatted",
                },
              ],
            },
          },
          {
            text: "— Cal ID",
            type: "FOOTER",
          },
        ],
        sub_category: "CUSTOM",
        parameter_format: "NAMED",
      };
    case WorkflowTemplates.CANCELLED:
      return {
        components: [
          {
            text: "{{event_type_name}} — Cancelled",
            type: "HEADER",
            format: "TEXT",
            example: {
              header_text_named_params: [
                {
                  example: "Quick Chat",
                  param_name: "event_type_name",
                },
              ],
            },
          },
          {
            text: 'Hi {{recipient_name}} — Your meeting "{{event_type_name}}" with {{sender_name}} scheduled for {{event_date}} at {{event_time_formatted}} has been cancelled.',
            type: "BODY",
            example: {
              body_text_named_params: [
                {
                  example: "Manas",
                  param_name: "recipient_name",
                },
                {
                  example: "Quick Chat",
                  param_name: "event_type_name",
                },
                {
                  example: "Rohit",
                  param_name: "sender_name",
                },
                {
                  example: "24 Jan 2026",
                  param_name: "event_date",
                },
                {
                  example: "3:00am GMT+5:30",
                  param_name: "event_time_formatted",
                },
              ],
            },
          },
          {
            text: "— Cal ID",
            type: "FOOTER",
          },
        ],
        sub_category: "CUSTOM",
        parameter_format: "NAMED",
      };
    case WorkflowTemplates.RESCHEDULED:
      return {
        components: [
          {
            text: "{{event_type_name}} — Rescheduled",
            type: "HEADER",
            format: "TEXT",
            example: {
              header_text_named_params: [
                {
                  example: "Quick Chat",
                  param_name: "event_type_name",
                },
              ],
            },
          },
          {
            text: 'Hi {{recipient_name}} — Your meeting "{{event_type_name}}" with {{sender_name}} has a new time: {{event_date}} at {{event_time_formatted}}. See you then!',
            type: "BODY",
            example: {
              body_text_named_params: [
                {
                  example: "Manas",
                  param_name: "recipient_name",
                },
                {
                  example: "Quick Chat",
                  param_name: "event_type_name",
                },
                {
                  example: "Rohit",
                  param_name: "sender_name",
                },
                {
                  example: "24 Jan 2026",
                  param_name: "event_date",
                },
                {
                  example: "3:00am GMT+5:30",
                  param_name: "event_time_formatted",
                },
              ],
            },
          },
          {
            text: "— Cal ID",
            type: "FOOTER",
          },
        ],
        sub_category: "CUSTOM",
        parameter_format: "NAMED",
      };
    case WorkflowTemplates.COMPLETED:
      return {
        components: [
          {
            text: "{{event_type_name}} — Completed",
            type: "HEADER",
            format: "TEXT",
            example: {
              header_text_named_params: [
                {
                  example: "Quick Chat",
                  param_name: "event_type_name",
                },
              ],
            },
          },
          {
            text: 'Hi {{recipient_name}} — Your meeting "{{event_type_name}}" with {{sender_name}} on {{event_date}} at {{event_time_formatted}} is all wrapped up. Thanks for joining!',
            type: "BODY",
            example: {
              body_text_named_params: [
                {
                  example: "Manas",
                  param_name: "recipient_name",
                },
                {
                  example: "Quick Chat",
                  param_name: "event_type_name",
                },
                {
                  example: "Rohit",
                  param_name: "sender_name",
                },
                {
                  example: "24 Jan 2026",
                  param_name: "event_date",
                },
                {
                  example: "3:00am GMT+5:30",
                  param_name: "event_time_formatted",
                },
              ],
            },
          },
          {
            text: "— Cal ID",
            type: "FOOTER",
          },
        ],
        sub_category: "CUSTOM",
        parameter_format: "NAMED",
      };

    case WorkflowTemplates.CONFIRMATION:
      return {
        components: [
          {
            text: "{{event_type_name}} — Confirmed",
            type: "HEADER",
            format: "TEXT",
            example: {
              header_text_named_params: [
                {
                  example: "Quick Chat",
                  param_name: "event_type_name",
                },
              ],
            },
          },
          {
            text: 'Hi {{recipient_name}} — You are all set! Your meeting "{{event_type_name}}" with {{sender_name}} is confirmed for {{event_date}} at {{event_time_formatted}}. See you then!',
            type: "BODY",
            example: {
              body_text_named_params: [
                {
                  example: "Manas",
                  param_name: "recipient_name",
                },
                {
                  example: "Quick Chat",
                  param_name: "event_type_name",
                },
                {
                  example: " Rohit",
                  param_name: "sender_name",
                },
                {
                  example: "24 Jan 2026",
                  param_name: "event_date",
                },
                {
                  example: "3:00am GMT+5:30",
                  param_name: "event_time_formatted",
                },
              ],
            },
          },
          {
            text: "— Cal ID",
            type: "FOOTER",
          },
        ],
        sub_category: "CUSTOM",
        parameter_format: "NAMED",
      };

    default:
      throw new Error(`Unsupported workflow template: ${templateName}`);
  }
};
