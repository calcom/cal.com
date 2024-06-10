import type { TemplateType, Fields } from "./zod-utils";
import { fieldNameEnum } from "./zod-utils";

export const TEMPLATES_FIELDS: Record<TemplateType, Fields> = {
  CHECK_IN_APPPOINTMENT: [
    {
      type: "text",
      name: fieldNameEnum.enum.schedulerName,
      required: true,
      defaultLabel: "scheduler_name",
      placeholder: "Enter your name",
    },
  ],
};
