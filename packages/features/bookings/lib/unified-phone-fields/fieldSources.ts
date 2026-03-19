import type { Workflow } from "@calcom/features/ee/workflows/lib/types";
import { ATTENDEE_PHONE_NUMBER_FIELD } from "@calcom/lib/bookings/SystemField";
import type { FieldSource } from "@calcom/prisma/zod-utils";
import { CALAI_FIELD_TEMPLATE, SMS_FIELD_TEMPLATE } from "./managePhoneFields";

export const getSmsReminderNumberField = () => SMS_FIELD_TEMPLATE;

export const getSmsReminderNumberSource = ({
  workflowId,
  isSmsReminderNumberRequired,
}: {
  workflowId: Workflow["id"];
  isSmsReminderNumberRequired: boolean;
}): FieldSource => ({
  id: `${workflowId}`,
  type: "workflow",
  label: "Workflow",
  fieldRequired: isSmsReminderNumberRequired,
  editUrl: `/workflows/${workflowId}`,
  subType: "sms",
});

export const getAIAgentCallPhoneNumberField = () => CALAI_FIELD_TEMPLATE;

export const getAIAgentCallPhoneNumberSource = ({
  workflowId,
  isAIAgentCallPhoneNumberRequired,
}: {
  workflowId: Workflow["id"];
  isAIAgentCallPhoneNumberRequired: boolean;
}): FieldSource => ({
  id: `${workflowId}`,
  type: "workflow",
  label: "Workflow",
  fieldRequired: isAIAgentCallPhoneNumberRequired,
  editUrl: `/workflows/${workflowId}`,
  subType: "calai",
});

export const getAttendeePhoneNumberField = () =>
  ({
    name: ATTENDEE_PHONE_NUMBER_FIELD,
    type: "phone",
    defaultLabel: "phone_number",
    defaultPlaceholder: "enter_phone_number",
    editable: "system-but-optional",
  }) as const;

export const getAttendeePhoneNumberSource = ({
  workflowId,
  isRequired,
  subType,
  workflowName,
}: {
  workflowId: Workflow["id"];
  isRequired: boolean;
  subType: "sms" | "calai";
  workflowName?: string;
}): FieldSource => ({
  id: `${workflowId}`,
  type: "workflow",
  label: workflowName ?? "Workflow",
  fieldRequired: isRequired,
  editUrl: `/workflows/${workflowId}`,
  subType,
});
