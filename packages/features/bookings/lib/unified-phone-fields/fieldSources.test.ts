import { describe, expect, it } from "vitest";

import {
  getAttendeePhoneNumberField,
  getAttendeePhoneNumberSource,
  getSmsReminderNumberField,
  getSmsReminderNumberSource,
  getAIAgentCallPhoneNumberField,
  getAIAgentCallPhoneNumberSource,
} from "./fieldSources";

describe("getAttendeePhoneNumberField", () => {
  it("should return the correct field definition", () => {
    const field = getAttendeePhoneNumberField();
    expect(field).toEqual({
      name: "attendeePhoneNumber",
      type: "phone",
      defaultLabel: "phone_number",
      defaultPlaceholder: "enter_phone_number",
      editable: "system-but-optional",
    });
  });

  it("should return consistent results across multiple calls", () => {
    const field1 = getAttendeePhoneNumberField();
    const field2 = getAttendeePhoneNumberField();
    expect(field1).toEqual(field2);
  });
});

describe("getAttendeePhoneNumberSource", () => {
  it("should return SMS source with correct properties", () => {
    const source = getAttendeePhoneNumberSource({
      workflowId: 42,
      isRequired: true,
      subType: "sms",
      workflowName: "My SMS Workflow",
    });
    expect(source).toEqual({
      id: "42",
      type: "workflow",
      label: "My SMS Workflow",
      fieldRequired: true,
      editUrl: "/workflows/42",
      subType: "sms",
    });
  });

  it("should return Cal.ai source with correct properties", () => {
    const source = getAttendeePhoneNumberSource({
      workflowId: 99,
      isRequired: false,
      subType: "calai",
      workflowName: "AI Call Workflow",
    });
    expect(source).toEqual({
      id: "99",
      type: "workflow",
      label: "AI Call Workflow",
      fieldRequired: false,
      editUrl: "/workflows/99",
      subType: "calai",
    });
  });

  it("should default label to 'Workflow' when workflowName is not provided", () => {
    const source = getAttendeePhoneNumberSource({
      workflowId: 1,
      isRequired: false,
      subType: "sms",
    });
    expect(source.label).toBe("Workflow");
  });

  it("should stringify workflowId for the source id", () => {
    const source = getAttendeePhoneNumberSource({
      workflowId: 123,
      isRequired: true,
      subType: "calai",
    });
    expect(source.id).toBe("123");
    expect(typeof source.id).toBe("string");
  });
});

describe("getSmsReminderNumberField", () => {
  it("should return the correct field definition", () => {
    const field = getSmsReminderNumberField();
    expect(field).toEqual({
      name: "smsReminderNumber",
      type: "phone",
      defaultLabel: "number_text_notifications",
      defaultPlaceholder: "enter_phone_number",
      editable: "system",
    });
  });
});

describe("getSmsReminderNumberSource", () => {
  it("should return source with correct properties", () => {
    const source = getSmsReminderNumberSource({
      workflowId: 10,
      isSmsReminderNumberRequired: true,
    });
    expect(source).toEqual({
      id: "10",
      type: "workflow",
      label: "Workflow",
      fieldRequired: true,
      editUrl: "/workflows/10",
      subType: "sms",
    });
  });

  it("should always set subType to 'sms'", () => {
    const source = getSmsReminderNumberSource({
      workflowId: 1,
      isSmsReminderNumberRequired: false,
    });
    expect(source.subType).toBe("sms");
  });
});

describe("getAIAgentCallPhoneNumberField", () => {
  it("should return the correct field definition", () => {
    const field = getAIAgentCallPhoneNumberField();
    expect(field).toEqual({
      name: "aiAgentCallPhoneNumber",
      type: "phone",
      defaultLabel: "phone_number_for_ai_call",
      defaultPlaceholder: "enter_phone_number",
      editable: "system",
    });
  });
});

describe("getAIAgentCallPhoneNumberSource", () => {
  it("should return source with correct properties", () => {
    const source = getAIAgentCallPhoneNumberSource({
      workflowId: 77,
      isAIAgentCallPhoneNumberRequired: true,
    });
    expect(source).toEqual({
      id: "77",
      type: "workflow",
      label: "Workflow",
      fieldRequired: true,
      editUrl: "/workflows/77",
      subType: "calai",
    });
  });

  it("should always set subType to 'calai'", () => {
    const source = getAIAgentCallPhoneNumberSource({
      workflowId: 1,
      isAIAgentCallPhoneNumberRequired: false,
    });
    expect(source.subType).toBe("calai");
  });

  it("should set fieldRequired based on isAIAgentCallPhoneNumberRequired", () => {
    const requiredSource = getAIAgentCallPhoneNumberSource({
      workflowId: 1,
      isAIAgentCallPhoneNumberRequired: true,
    });
    expect(requiredSource.fieldRequired).toBe(true);

    const optionalSource = getAIAgentCallPhoneNumberSource({
      workflowId: 2,
      isAIAgentCallPhoneNumberRequired: false,
    });
    expect(optionalSource.fieldRequired).toBe(false);
  });
});
