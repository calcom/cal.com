import type { TemplateType, Fields } from "./zod-utils";
import { fieldNameEnum } from "./zod-utils";

export const templateFieldsMap: Record<TemplateType, Fields> = {
  CHECK_IN_APPOINTMENT: [
    {
      type: "text",
      name: fieldNameEnum.enum.schedulerName,
      required: true,
      defaultLabel: "scheduler_name",
      placeholder: "Enter your name",
    },
  ],
  CUSTOM_TEMPLATE: [
    {
      type: "textarea",
      name: fieldNameEnum.enum.generalPrompt,
      required: true,
      defaultLabel: "general_prompt",
      placeholder: "Enter your prompt",
    },
    {
      type: "text",
      name: fieldNameEnum.enum.beginMessage,
      required: true,
      defaultLabel: "begin_message",
      placeholder: "begin_message",
    },
    {
      type: "text",
      name: fieldNameEnum.enum.guestName,
      required: false,
      defaultLabel: "guest_name",
      placeholder: "guest_name",
      variableName: "name",
    },
    {
      type: "email",
      name: fieldNameEnum.enum.guestEmail,
      required: false,
      defaultLabel: "guest_email",
      placeholder: "guest_email",
      variableName: "email",
    },
    {
      type: "text",
      name: fieldNameEnum.enum.guestCompany,
      required: false,
      defaultLabel: "guest_company",
      placeholder: "guest_company",
      variableName: "company",
    },
  ],
};
