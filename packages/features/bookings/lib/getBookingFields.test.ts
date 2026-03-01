import { describe, expect, it, vi } from "vitest";

// biome-ignore lint/style/noProcessEnv: test setup requires setting env var
process.env.INTEGRATION_TEST_MODE = "true";

vi.mock("@calcom/features/form-builder/fieldsThatSupportLabelAsSafeHtml", () => ({
  fieldsThatSupportLabelAsSafeHtml: ["text", "textarea"],
}));

vi.mock("@calcom/lib/markdownToSafeHTML", () => ({
  markdownToSafeHTML: vi.fn((label: string | null) => label || ""),
}));

import {
  ensureBookingInputsHaveSystemFields,
  getAIAgentCallPhoneNumberField,
  getAIAgentCallPhoneNumberSource,
  getSmsReminderNumberField,
  getSmsReminderNumberSource,
} from "./getBookingFields";

describe("getBookingFields helpers", () => {
  it("getSmsReminderNumberField returns correct field shape", () => {
    const field = getSmsReminderNumberField();
    expect(field.type).toBe("phone");
    expect(field.editable).toBe("system");
    expect(field.name).toBeDefined();
  });

  it("getSmsReminderNumberSource returns correct source shape", () => {
    const source = getSmsReminderNumberSource({ workflowId: 1, isSmsReminderNumberRequired: true });
    expect(source.id).toBe("1");
    expect(source.type).toBe("workflow");
    expect(source.fieldRequired).toBe(true);
  });

  it("getAIAgentCallPhoneNumberField returns correct field shape", () => {
    const field = getAIAgentCallPhoneNumberField();
    expect(field.type).toBe("phone");
    expect(field.editable).toBe("system");
  });

  it("getAIAgentCallPhoneNumberSource returns correct source shape", () => {
    const source = getAIAgentCallPhoneNumberSource({
      workflowId: 2,
      isAIAgentCallPhoneNumberRequired: false,
    });
    expect(source.id).toBe("2");
    expect(source.fieldRequired).toBe(false);
  });
});

describe("ensureBookingInputsHaveSystemFields", () => {
  it("adds system before fields (name, email, phone, location) when empty", () => {
    const result = ensureBookingInputsHaveSystemFields({
      bookingFields: [],
      disableGuests: false,
      isOrgTeamEvent: false,
      additionalNotesRequired: false,
      customInputs: [],
      workflows: [],
    });

    const fieldNames = result.map((f) => f.name);
    expect(fieldNames).toContain("name");
    expect(fieldNames).toContain("email");
    expect(fieldNames).toContain("location");
  });

  it("adds system after fields (title, notes, guests, rescheduleReason)", () => {
    const result = ensureBookingInputsHaveSystemFields({
      bookingFields: [],
      disableGuests: false,
      isOrgTeamEvent: false,
      additionalNotesRequired: false,
      customInputs: [],
      workflows: [],
    });

    const fieldNames = result.map((f) => f.name);
    expect(fieldNames).toContain("title");
    expect(fieldNames).toContain("notes");
    expect(fieldNames).toContain("guests");
    expect(fieldNames).toContain("rescheduleReason");
  });

  it("hides guests field when disableGuests is true", () => {
    const result = ensureBookingInputsHaveSystemFields({
      bookingFields: [],
      disableGuests: true,
      isOrgTeamEvent: false,
      additionalNotesRequired: false,
      customInputs: [],
      workflows: [],
    });

    const guestsField = result.find((f) => f.name === "guests");
    expect(guestsField?.hidden).toBe(true);
  });

  it("makes notes required when additionalNotesRequired is true", () => {
    const result = ensureBookingInputsHaveSystemFields({
      bookingFields: [],
      disableGuests: false,
      isOrgTeamEvent: false,
      additionalNotesRequired: true,
      customInputs: [],
      workflows: [],
    });

    const notesField = result.find((f) => f.name === "notes");
    expect(notesField?.required).toBe(true);
  });

  it("does not duplicate existing system fields", () => {
    const existingFields = [
      {
        type: "name" as const,
        name: "name",
        editable: "system" as const,
        required: true,
        sources: [{ label: "Default", id: "default", type: "default" as const }],
      },
    ];

    const result = ensureBookingInputsHaveSystemFields({
      bookingFields: existingFields,
      disableGuests: false,
      isOrgTeamEvent: false,
      additionalNotesRequired: false,
      customInputs: [],
      workflows: [],
    });

    const nameFields = result.filter((f) => f.name === "name");
    expect(nameFields).toHaveLength(1);
  });

  it("migrates custom inputs when bookingFields is empty", () => {
    const customInputs = [
      { id: 1, label: "Company", type: "TEXT" as const, required: true, placeholder: "Enter company" },
    ];

    const result = ensureBookingInputsHaveSystemFields({
      bookingFields: [],
      disableGuests: false,
      isOrgTeamEvent: false,
      additionalNotesRequired: false,
      customInputs: customInputs as never,
      workflows: [],
    });

    const companyField = result.find((f) => f.label === "Company");
    expect(companyField).toBeDefined();
    expect(companyField?.required).toBe(true);
  });
});
