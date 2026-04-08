import { describe, expect, it } from "vitest";

import { WorkflowActions, WorkflowTemplates, WorkflowTriggerEvents } from "@calcom/prisma/enums";

import {
  getEventTypeIdForCalAiTest,
  getWhatsappTemplateForTrigger,
  hasCalAIAction,
  isAttendeeAction,
  isCalAIAction,
  isEmailAction,
  isEmailToAttendeeAction,
  isFormTrigger,
  isSMSAction,
  isSMSOrWhatsappAction,
  isTextMessageToSpecificNumber,
  isWhatsappAction,
  shouldScheduleEmailReminder,
  shouldScheduleSMSReminder,
} from "./actionHelperFunctions";

describe("shouldScheduleEmailReminder", () => {
  it("returns true for EMAIL_ATTENDEE", () => {
    expect(shouldScheduleEmailReminder(WorkflowActions.EMAIL_ATTENDEE)).toBe(true);
  });

  it("returns true for EMAIL_HOST", () => {
    expect(shouldScheduleEmailReminder(WorkflowActions.EMAIL_HOST)).toBe(true);
  });

  it("returns false for SMS_ATTENDEE", () => {
    expect(shouldScheduleEmailReminder(WorkflowActions.SMS_ATTENDEE)).toBe(false);
  });

  it("returns false for WHATSAPP_NUMBER", () => {
    expect(shouldScheduleEmailReminder(WorkflowActions.WHATSAPP_NUMBER)).toBe(false);
  });
});

describe("shouldScheduleSMSReminder", () => {
  it("returns true for SMS_ATTENDEE", () => {
    expect(shouldScheduleSMSReminder(WorkflowActions.SMS_ATTENDEE)).toBe(true);
  });

  it("returns true for SMS_NUMBER", () => {
    expect(shouldScheduleSMSReminder(WorkflowActions.SMS_NUMBER)).toBe(true);
  });

  it("returns false for EMAIL_HOST", () => {
    expect(shouldScheduleSMSReminder(WorkflowActions.EMAIL_HOST)).toBe(false);
  });
});

describe("isSMSAction", () => {
  it("returns true for SMS_ATTENDEE", () => {
    expect(isSMSAction(WorkflowActions.SMS_ATTENDEE)).toBe(true);
  });

  it("returns true for SMS_NUMBER", () => {
    expect(isSMSAction(WorkflowActions.SMS_NUMBER)).toBe(true);
  });

  it("returns false for EMAIL_HOST", () => {
    expect(isSMSAction(WorkflowActions.EMAIL_HOST)).toBe(false);
  });

  it("returns false for WHATSAPP_NUMBER", () => {
    expect(isSMSAction(WorkflowActions.WHATSAPP_NUMBER)).toBe(false);
  });
});

describe("isWhatsappAction", () => {
  it("returns true for WHATSAPP_NUMBER", () => {
    expect(isWhatsappAction(WorkflowActions.WHATSAPP_NUMBER)).toBe(true);
  });

  it("returns true for WHATSAPP_ATTENDEE", () => {
    expect(isWhatsappAction(WorkflowActions.WHATSAPP_ATTENDEE)).toBe(true);
  });

  it("returns false for SMS_NUMBER", () => {
    expect(isWhatsappAction(WorkflowActions.SMS_NUMBER)).toBe(false);
  });
});

describe("isSMSOrWhatsappAction", () => {
  it("returns true for SMS_ATTENDEE", () => {
    expect(isSMSOrWhatsappAction(WorkflowActions.SMS_ATTENDEE)).toBe(true);
  });

  it("returns true for WHATSAPP_ATTENDEE", () => {
    expect(isSMSOrWhatsappAction(WorkflowActions.WHATSAPP_ATTENDEE)).toBe(true);
  });

  it("returns false for EMAIL_HOST", () => {
    expect(isSMSOrWhatsappAction(WorkflowActions.EMAIL_HOST)).toBe(false);
  });
});

describe("isCalAIAction", () => {
  it("returns true for CAL_AI_PHONE_CALL", () => {
    expect(isCalAIAction(WorkflowActions.CAL_AI_PHONE_CALL)).toBe(true);
  });

  it("returns false for EMAIL_HOST", () => {
    expect(isCalAIAction(WorkflowActions.EMAIL_HOST)).toBe(false);
  });
});

describe("isEmailAction", () => {
  it("returns true for EMAIL_HOST", () => {
    expect(isEmailAction(WorkflowActions.EMAIL_HOST)).toBe(true);
  });

  it("returns true for EMAIL_ATTENDEE", () => {
    expect(isEmailAction(WorkflowActions.EMAIL_ATTENDEE)).toBe(true);
  });

  it("returns true for EMAIL_ADDRESS", () => {
    expect(isEmailAction(WorkflowActions.EMAIL_ADDRESS)).toBe(true);
  });

  it("returns false for SMS_ATTENDEE", () => {
    expect(isEmailAction(WorkflowActions.SMS_ATTENDEE)).toBe(false);
  });
});

describe("isAttendeeAction", () => {
  it("returns true for SMS_ATTENDEE", () => {
    expect(isAttendeeAction(WorkflowActions.SMS_ATTENDEE)).toBe(true);
  });

  it("returns true for EMAIL_ATTENDEE", () => {
    expect(isAttendeeAction(WorkflowActions.EMAIL_ATTENDEE)).toBe(true);
  });

  it("returns true for WHATSAPP_ATTENDEE", () => {
    expect(isAttendeeAction(WorkflowActions.WHATSAPP_ATTENDEE)).toBe(true);
  });

  it("returns false for EMAIL_HOST", () => {
    expect(isAttendeeAction(WorkflowActions.EMAIL_HOST)).toBe(false);
  });

  it("returns false for SMS_NUMBER", () => {
    expect(isAttendeeAction(WorkflowActions.SMS_NUMBER)).toBe(false);
  });
});

describe("isEmailToAttendeeAction", () => {
  it("returns true for EMAIL_ATTENDEE", () => {
    expect(isEmailToAttendeeAction(WorkflowActions.EMAIL_ATTENDEE)).toBe(true);
  });

  it("returns false for EMAIL_HOST", () => {
    expect(isEmailToAttendeeAction(WorkflowActions.EMAIL_HOST)).toBe(false);
  });
});

describe("isTextMessageToSpecificNumber", () => {
  it("returns true for SMS_NUMBER", () => {
    expect(isTextMessageToSpecificNumber(WorkflowActions.SMS_NUMBER)).toBe(true);
  });

  it("returns true for WHATSAPP_NUMBER", () => {
    expect(isTextMessageToSpecificNumber(WorkflowActions.WHATSAPP_NUMBER)).toBe(true);
  });

  it("returns false for SMS_ATTENDEE", () => {
    expect(isTextMessageToSpecificNumber(WorkflowActions.SMS_ATTENDEE)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isTextMessageToSpecificNumber(undefined)).toBe(false);
  });
});

describe("getWhatsappTemplateForTrigger", () => {
  it("returns REMINDER for NEW_EVENT", () => {
    expect(getWhatsappTemplateForTrigger(WorkflowTriggerEvents.NEW_EVENT)).toBe(WorkflowTemplates.REMINDER);
  });

  it("returns REMINDER for BEFORE_EVENT", () => {
    expect(getWhatsappTemplateForTrigger(WorkflowTriggerEvents.BEFORE_EVENT)).toBe(WorkflowTemplates.REMINDER);
  });

  it("returns COMPLETED for AFTER_EVENT", () => {
    expect(getWhatsappTemplateForTrigger(WorkflowTriggerEvents.AFTER_EVENT)).toBe(WorkflowTemplates.COMPLETED);
  });

  it("returns CANCELLED for EVENT_CANCELLED", () => {
    expect(getWhatsappTemplateForTrigger(WorkflowTriggerEvents.EVENT_CANCELLED)).toBe(
      WorkflowTemplates.CANCELLED
    );
  });

  it("returns RESCHEDULED for RESCHEDULE_EVENT", () => {
    expect(getWhatsappTemplateForTrigger(WorkflowTriggerEvents.RESCHEDULE_EVENT)).toBe(
      WorkflowTemplates.RESCHEDULED
    );
  });
});

describe("isFormTrigger", () => {
  it("returns true for FORM_SUBMITTED", () => {
    expect(isFormTrigger(WorkflowTriggerEvents.FORM_SUBMITTED)).toBe(true);
  });

  it("returns true for FORM_SUBMITTED_NO_EVENT", () => {
    expect(isFormTrigger(WorkflowTriggerEvents.FORM_SUBMITTED_NO_EVENT)).toBe(true);
  });

  it("returns false for NEW_EVENT", () => {
    expect(isFormTrigger(WorkflowTriggerEvents.NEW_EVENT)).toBe(false);
  });
});

describe("hasCalAIAction", () => {
  it("returns true when steps contain CAL_AI_PHONE_CALL", () => {
    const steps = [
      { action: WorkflowActions.CAL_AI_PHONE_CALL },
      { action: WorkflowActions.EMAIL_HOST },
    ];
    expect(hasCalAIAction(steps as Parameters<typeof hasCalAIAction>[0])).toBe(true);
  });

  it("returns false when no steps have CAL_AI_PHONE_CALL", () => {
    const steps = [{ action: WorkflowActions.EMAIL_HOST }, { action: WorkflowActions.SMS_ATTENDEE }];
    expect(hasCalAIAction(steps as Parameters<typeof hasCalAIAction>[0])).toBe(false);
  });

  it("returns false for empty steps", () => {
    expect(hasCalAIAction([])).toBe(false);
  });
});

describe("getEventTypeIdForCalAiTest", () => {
  const t = ((key: string) => key) as Parameters<typeof getEventTypeIdForCalAiTest>[0]["t"];

  it("returns outboundEventTypeId for FORM_SUBMITTED trigger", () => {
    const result = getEventTypeIdForCalAiTest({
      trigger: WorkflowTriggerEvents.FORM_SUBMITTED,
      outboundEventTypeId: 42,
      t,
    });
    expect(result).toEqual({ eventTypeId: 42, error: null });
  });

  it("returns error when FORM_SUBMITTED has no outboundEventTypeId", () => {
    const result = getEventTypeIdForCalAiTest({
      trigger: WorkflowTriggerEvents.FORM_SUBMITTED,
      outboundEventTypeId: null,
      t,
    });
    expect(result.eventTypeId).toBeNull();
    expect(result.error).toBe("choose_event_type_in_agent_setup");
  });

  it("returns first eventTypeId for FORM_SUBMITTED_NO_EVENT trigger", () => {
    const result = getEventTypeIdForCalAiTest({
      trigger: WorkflowTriggerEvents.FORM_SUBMITTED_NO_EVENT,
      eventTypeIds: [10, 20],
      t,
    });
    expect(result).toEqual({ eventTypeId: 10, error: null });
  });

  it("returns error when FORM_SUBMITTED_NO_EVENT has no eventTypeIds", () => {
    const result = getEventTypeIdForCalAiTest({
      trigger: WorkflowTriggerEvents.FORM_SUBMITTED_NO_EVENT,
      eventTypeIds: [],
      t,
    });
    expect(result.eventTypeId).toBeNull();
    expect(result.error).toBe("no_event_types_available_for_test_call");
  });

  it("returns parsed eventTypeId for regular trigger", () => {
    const result = getEventTypeIdForCalAiTest({
      trigger: WorkflowTriggerEvents.NEW_EVENT,
      activeOnEventTypeId: "123",
      t,
    });
    expect(result).toEqual({ eventTypeId: 123, error: null });
  });

  it("returns error when regular trigger has no activeOnEventTypeId", () => {
    const result = getEventTypeIdForCalAiTest({
      trigger: WorkflowTriggerEvents.NEW_EVENT,
      t,
    });
    expect(result.eventTypeId).toBeNull();
    expect(result.error).toBe("choose_at_least_one_event_type_test_call");
  });

  it("returns error for NaN activeOnEventTypeId", () => {
    const result = getEventTypeIdForCalAiTest({
      trigger: WorkflowTriggerEvents.NEW_EVENT,
      activeOnEventTypeId: "not-a-number",
      t,
    });
    expect(result.eventTypeId).toBeNull();
    expect(result.error).toBe("choose_at_least_one_event_type_test_call");
  });
});
