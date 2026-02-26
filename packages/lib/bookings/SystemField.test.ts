import { describe, expect, it } from "vitest";
import {
  ATTENDEE_PHONE_NUMBER_FIELD,
  CAL_AI_AGENT_PHONE_NUMBER_FIELD,
  SMS_REMINDER_NUMBER_FIELD,
  SYSTEM_PHONE_FIELDS,
  SystemField,
  shouldShowFieldInCustomResponses,
  TITLE_FIELD,
} from "./SystemField";

describe("SystemField", () => {
  it("parses valid system field names", () => {
    const validFields = [
      "name",
      "email",
      "location",
      "title",
      "notes",
      "guests",
      "rescheduleReason",
      "smsReminderNumber",
      "attendeePhoneNumber",
      "aiAgentCallPhoneNumber",
    ];

    for (const field of validFields) {
      const result = SystemField.safeParse(field);
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid field names", () => {
    const result = SystemField.safeParse("invalidField");
    expect(result.success).toBe(false);
  });

  it("rejects empty string", () => {
    const result = SystemField.safeParse("");
    expect(result.success).toBe(false);
  });
});

describe("constants", () => {
  it("SMS_REMINDER_NUMBER_FIELD equals 'smsReminderNumber'", () => {
    expect(SMS_REMINDER_NUMBER_FIELD).toBe("smsReminderNumber");
  });

  it("CAL_AI_AGENT_PHONE_NUMBER_FIELD equals 'aiAgentCallPhoneNumber'", () => {
    expect(CAL_AI_AGENT_PHONE_NUMBER_FIELD).toBe("aiAgentCallPhoneNumber");
  });

  it("TITLE_FIELD equals 'title'", () => {
    expect(TITLE_FIELD).toBe("title");
  });

  it("ATTENDEE_PHONE_NUMBER_FIELD equals 'attendeePhoneNumber'", () => {
    expect(ATTENDEE_PHONE_NUMBER_FIELD).toBe("attendeePhoneNumber");
  });

  it("SYSTEM_PHONE_FIELDS contains all phone-related fields", () => {
    expect(SYSTEM_PHONE_FIELDS.has(ATTENDEE_PHONE_NUMBER_FIELD)).toBe(true);
    expect(SYSTEM_PHONE_FIELDS.has(SMS_REMINDER_NUMBER_FIELD)).toBe(true);
    expect(SYSTEM_PHONE_FIELDS.has(CAL_AI_AGENT_PHONE_NUMBER_FIELD)).toBe(true);
    expect(SYSTEM_PHONE_FIELDS.size).toBe(3);
  });
});

describe("shouldShowFieldInCustomResponses", () => {
  it("returns false for 'name' (system field without exception)", () => {
    expect(shouldShowFieldInCustomResponses("name")).toBe(false);
  });

  it("returns false for 'email' (system field without exception)", () => {
    expect(shouldShowFieldInCustomResponses("email")).toBe(false);
  });

  it("returns false for 'location' (system field without exception)", () => {
    expect(shouldShowFieldInCustomResponses("location")).toBe(false);
  });

  it("returns false for 'notes' (system field without exception)", () => {
    expect(shouldShowFieldInCustomResponses("notes")).toBe(false);
  });

  it("returns false for 'guests' (system field without exception)", () => {
    expect(shouldShowFieldInCustomResponses("guests")).toBe(false);
  });

  it("returns false for 'rescheduleReason' (system field without exception)", () => {
    expect(shouldShowFieldInCustomResponses("rescheduleReason")).toBe(false);
  });

  it("returns true for 'smsReminderNumber' (exception - no dedicated UI section)", () => {
    expect(shouldShowFieldInCustomResponses("smsReminderNumber")).toBe(true);
  });

  it("returns true for 'title' (exception - no dedicated UI section)", () => {
    expect(shouldShowFieldInCustomResponses("title")).toBe(true);
  });

  it("returns true for non-system fields (custom booking fields)", () => {
    expect(shouldShowFieldInCustomResponses("customField1")).toBe(true);
    expect(shouldShowFieldInCustomResponses("mySpecialField")).toBe(true);
  });

  it("returns true for empty string (not a system field)", () => {
    expect(shouldShowFieldInCustomResponses("")).toBe(true);
  });
});
