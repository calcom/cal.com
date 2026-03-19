import { describe, it, expect } from "vitest";

import {
  ATTENDEE_PHONE_NUMBER_FIELD,
  CAL_AI_AGENT_PHONE_NUMBER_FIELD,
  SMS_REMINDER_NUMBER_FIELD,
} from "@calcom/lib/bookings/SystemField";

import { resolveAndMutatePhoneFieldValues } from "../resolvePhoneFieldValues";

describe("Unified Phone Fields – phone number resolution for bookings", () => {
  const PHONE_NUMBER = "+1234567890";
  const CALAI_PHONE = "+5555555555";

  const unifiedBookingFields = [
    { name: SMS_REMINDER_NUMBER_FIELD },
    { name: ATTENDEE_PHONE_NUMBER_FIELD },
  ];

  describe("when unified phone fields is OFF (separate phone fields per feature)", () => {
    const splitBookingFields = [
      { name: SMS_REMINDER_NUMBER_FIELD },
      { name: ATTENDEE_PHONE_NUMBER_FIELD },
      { name: CAL_AI_AGENT_PHONE_NUMBER_FIELD },
    ];

    it("keeps each phone field independent and does not mutate responses when all are explicitly provided", () => {
      const responses: Record<string, unknown> = {
        [SMS_REMINDER_NUMBER_FIELD]: PHONE_NUMBER,
        [ATTENDEE_PHONE_NUMBER_FIELD]: "+0000000000",
        [CAL_AI_AGENT_PHONE_NUMBER_FIELD]: CALAI_PHONE,
      };
      const responsesBefore = { ...responses };
      const result = resolveAndMutatePhoneFieldValues({
        responses,
        bookingFields: splitBookingFields,
        isUnifiedPhoneFieldsEnabled: false,
      });
      expect(result).toEqual({
        smsReminderNumber: PHONE_NUMBER,
        attendeePhoneNumber: "+0000000000",
        calAiPhoneNumber: CALAI_PHONE,
      });
      expect(responses).toEqual(responsesBefore);
    });

    it("auto-fills SMS and Cal AI fields from attendee phone when booker only submits attendee phone number", () => {
      const responses: Record<string, unknown> = {
        [ATTENDEE_PHONE_NUMBER_FIELD]: PHONE_NUMBER,
      };
      const result = resolveAndMutatePhoneFieldValues({
        responses,
        bookingFields: splitBookingFields,
        isUnifiedPhoneFieldsEnabled: false,
      });
      expect(result).toEqual({
        smsReminderNumber: PHONE_NUMBER,
        attendeePhoneNumber: PHONE_NUMBER,
        calAiPhoneNumber: PHONE_NUMBER,
      });
    });

    it("does not auto-fill a phone field that the event type does not use", () => {
      const responses: Record<string, unknown> = {
        [ATTENDEE_PHONE_NUMBER_FIELD]: PHONE_NUMBER,
      };
      // Only smsReminderNumber in bookingFields, no calAi field
      const result = resolveAndMutatePhoneFieldValues({
        responses,
        bookingFields: [{ name: SMS_REMINDER_NUMBER_FIELD }, { name: ATTENDEE_PHONE_NUMBER_FIELD }],
        isUnifiedPhoneFieldsEnabled: false,
      });
      expect(result.smsReminderNumber).toBe(PHONE_NUMBER);
      expect(result.attendeePhoneNumber).toBe(PHONE_NUMBER);
      expect(result.calAiPhoneNumber).toBeUndefined();
    });

    it("returns no phone numbers when the booker submits an empty form", () => {
      const responses: Record<string, unknown> = {};
      const result = resolveAndMutatePhoneFieldValues({
        responses,
        bookingFields: splitBookingFields,
        isUnifiedPhoneFieldsEnabled: false,
      });
      expect(result).toEqual({
        smsReminderNumber: undefined,
        attendeePhoneNumber: undefined,
        calAiPhoneNumber: undefined,
      });
    });

    it("leaves booking responses untouched when no attendee phone is available to fall back on", () => {
      const responses: Record<string, unknown> = {};
      resolveAndMutatePhoneFieldValues({
        responses,
        bookingFields: splitBookingFields,
        isUnifiedPhoneFieldsEnabled: false,
      });
      expect(responses).toEqual({});
    });

    it("patches booking responses so stale booker submissions pass validation after unified was toggled off", () => {
      const responses: Record<string, unknown> = {
        [ATTENDEE_PHONE_NUMBER_FIELD]: PHONE_NUMBER,
      };
      resolveAndMutatePhoneFieldValues({
        responses,
        bookingFields: splitBookingFields,
        isUnifiedPhoneFieldsEnabled: false,
      });
      expect(responses[SMS_REMINDER_NUMBER_FIELD]).toBe(PHONE_NUMBER);
      expect(responses[CAL_AI_AGENT_PHONE_NUMBER_FIELD]).toBe(PHONE_NUMBER);
    });

    it("only uses attendee phone as a fallback source — Cal AI phone alone does not fill other fields", () => {
      const responses: Record<string, unknown> = { [CAL_AI_AGENT_PHONE_NUMBER_FIELD]: CALAI_PHONE };
      const result = resolveAndMutatePhoneFieldValues({
        responses,
        bookingFields: splitBookingFields,
        isUnifiedPhoneFieldsEnabled: false,
      });
      expect(result.smsReminderNumber).toBeUndefined();
      expect(result.attendeePhoneNumber).toBeUndefined();
      expect(result.calAiPhoneNumber).toBe(CALAI_PHONE);
    });

    it("treats empty-string field values the same as missing fields — falls back to attendee phone", () => {
      const responses: Record<string, unknown> = {
        [SMS_REMINDER_NUMBER_FIELD]: "",
        [ATTENDEE_PHONE_NUMBER_FIELD]: PHONE_NUMBER,
        [CAL_AI_AGENT_PHONE_NUMBER_FIELD]: "",
      };
      const result = resolveAndMutatePhoneFieldValues({
        responses,
        bookingFields: splitBookingFields,
        isUnifiedPhoneFieldsEnabled: false,
      });
      expect(result.smsReminderNumber).toBe(PHONE_NUMBER);
      expect(result.attendeePhoneNumber).toBe(PHONE_NUMBER);
      expect(result.calAiPhoneNumber).toBe(PHONE_NUMBER);
    });

    it("returns all undefined when every field is an empty string", () => {
      const responses: Record<string, unknown> = {
        [SMS_REMINDER_NUMBER_FIELD]: "",
        [ATTENDEE_PHONE_NUMBER_FIELD]: "",
        [CAL_AI_AGENT_PHONE_NUMBER_FIELD]: "",
      };
      const result = resolveAndMutatePhoneFieldValues({
        responses,
        bookingFields: splitBookingFields,
        isUnifiedPhoneFieldsEnabled: false,
      });
      expect(result.smsReminderNumber).toBeUndefined();
      expect(result.attendeePhoneNumber).toBeUndefined();
      expect(result.calAiPhoneNumber).toBeUndefined();
    });

    it("skips fallback on the server side (no bookingFields) — only returns what was explicitly submitted", () => {
      const responses: Record<string, unknown> = {
        [ATTENDEE_PHONE_NUMBER_FIELD]: PHONE_NUMBER,
      };
      const result = resolveAndMutatePhoneFieldValues({
        responses,
        isUnifiedPhoneFieldsEnabled: false,
      });
      expect(result.smsReminderNumber).toBeUndefined();
      expect(result.calAiPhoneNumber).toBeUndefined();
      expect(result.attendeePhoneNumber).toBe(PHONE_NUMBER);
    });
  });

  describe("when unified phone fields is ON — consolidating into a single attendee phone", () => {
    it("fills attendee phone from smsReminderNumber in responses", () => {
      const responses: Record<string, unknown> = {
        [SMS_REMINDER_NUMBER_FIELD]: PHONE_NUMBER,
      };
      resolveAndMutatePhoneFieldValues({
        responses,
        bookingFields: unifiedBookingFields,
        isUnifiedPhoneFieldsEnabled: true,
      });
      expect(responses[ATTENDEE_PHONE_NUMBER_FIELD]).toBe(PHONE_NUMBER);
    });

    it("preserves the booker-submitted attendee phone over any fallback", () => {
      const existing = "+9999999999";
      const responses: Record<string, unknown> = { [ATTENDEE_PHONE_NUMBER_FIELD]: existing };
      resolveAndMutatePhoneFieldValues({
        responses,
        bookingFields: unifiedBookingFields,
        isUnifiedPhoneFieldsEnabled: true,
      });
      expect(responses[ATTENDEE_PHONE_NUMBER_FIELD]).toBe(existing);
    });

    it("falls back to the Cal AI agent phone when no SMS source exists", () => {
      const responses: Record<string, unknown> = { [CAL_AI_AGENT_PHONE_NUMBER_FIELD]: CALAI_PHONE };
      resolveAndMutatePhoneFieldValues({
        responses,
        bookingFields: unifiedBookingFields,
        isUnifiedPhoneFieldsEnabled: true,
      });
      expect(responses[ATTENDEE_PHONE_NUMBER_FIELD]).toBe(CALAI_PHONE);
    });

    it("prioritizes the SMS reminder number over the Cal AI agent phone", () => {
      const responses: Record<string, unknown> = {
        [SMS_REMINDER_NUMBER_FIELD]: PHONE_NUMBER,
        [CAL_AI_AGENT_PHONE_NUMBER_FIELD]: CALAI_PHONE,
      };
      resolveAndMutatePhoneFieldValues({
        responses,
        bookingFields: unifiedBookingFields,
        isUnifiedPhoneFieldsEnabled: true,
      });
      expect(responses[ATTENDEE_PHONE_NUMBER_FIELD]).toBe(PHONE_NUMBER);
    });

    it("resolves smsReminderNumber to the valid SMS number when attendeePhoneNumber is an empty string", () => {
      const responses: Record<string, unknown> = {
        [ATTENDEE_PHONE_NUMBER_FIELD]: "",
        [SMS_REMINDER_NUMBER_FIELD]: PHONE_NUMBER,
      };
      const result = resolveAndMutatePhoneFieldValues({
        responses,
        bookingFields: unifiedBookingFields,
        isUnifiedPhoneFieldsEnabled: true,
      });
      expect(result.smsReminderNumber).toBe(PHONE_NUMBER);
      expect(result.attendeePhoneNumber).toBe(PHONE_NUMBER);
    });

    it("treats all empty-string responses the same as missing fields", () => {
      const responses: Record<string, unknown> = {
        [ATTENDEE_PHONE_NUMBER_FIELD]: "",
        [SMS_REMINDER_NUMBER_FIELD]: "",
        [CAL_AI_AGENT_PHONE_NUMBER_FIELD]: "",
      };
      const result = resolveAndMutatePhoneFieldValues({
        responses,
        bookingFields: unifiedBookingFields,
        isUnifiedPhoneFieldsEnabled: true,
      });
      expect(result.smsReminderNumber).toBeUndefined();
      expect(result.attendeePhoneNumber).toBeUndefined();
      expect(result.calAiPhoneNumber).toBeUndefined();
    });

    it("leaves attendee phone empty when no phone number exists anywhere", () => {
      const responses: Record<string, unknown> = {};
      resolveAndMutatePhoneFieldValues({
        responses,
        bookingFields: unifiedBookingFields,
        isUnifiedPhoneFieldsEnabled: true,
      });
      expect(responses[ATTENDEE_PHONE_NUMBER_FIELD]).toBeUndefined();
    });

    it("does not create an attendee phone when the event type has no phone field configured", () => {
      const responses: Record<string, unknown> = {
        [SMS_REMINDER_NUMBER_FIELD]: PHONE_NUMBER,
      };
      resolveAndMutatePhoneFieldValues({
        responses,
        bookingFields: [{ name: SMS_REMINDER_NUMBER_FIELD }],
        isUnifiedPhoneFieldsEnabled: true,
      });
      expect(responses[ATTENDEE_PHONE_NUMBER_FIELD]).toBeUndefined();
    });

    it("always populates attendee phone on the server side (API v2 / webhook handlers)", () => {
      const responses: Record<string, unknown> = {
        [SMS_REMINDER_NUMBER_FIELD]: PHONE_NUMBER,
      };
      resolveAndMutatePhoneFieldValues({
        responses,
        isUnifiedPhoneFieldsEnabled: true,
      });
      expect(responses[ATTENDEE_PHONE_NUMBER_FIELD]).toBe(PHONE_NUMBER);
    });
  });

  describe("resolved SMS reminder number for DB persistence", () => {
    it("uses the unified attendee phone as the SMS reminder number (canonical source in unified mode)", () => {
      const responses: Record<string, unknown> = {
        [ATTENDEE_PHONE_NUMBER_FIELD]: "+1111111111",
        [SMS_REMINDER_NUMBER_FIELD]: "+2222222222",
      };
      const result = resolveAndMutatePhoneFieldValues({
        responses,
        isUnifiedPhoneFieldsEnabled: true,
      });
      expect(result.smsReminderNumber).toBe("+1111111111");
    });

    it("derives SMS reminder from attendee phone when it is the only number available", () => {
      const responses: Record<string, unknown> = { [ATTENDEE_PHONE_NUMBER_FIELD]: PHONE_NUMBER };
      const result = resolveAndMutatePhoneFieldValues({
        responses,
        isUnifiedPhoneFieldsEnabled: true,
      });
      expect(result.smsReminderNumber).toBe(PHONE_NUMBER);
    });

    it("falls back to the submitted SMS field when no attendee phone was provided", () => {
      const responses: Record<string, unknown> = { [SMS_REMINDER_NUMBER_FIELD]: PHONE_NUMBER };
      const result = resolveAndMutatePhoneFieldValues({
        responses,
        isUnifiedPhoneFieldsEnabled: true,
      });
      expect(result.smsReminderNumber).toBe(PHONE_NUMBER);
    });

    it("falls back to the Cal AI agent phone when no SMS or attendee phone exists", () => {
      const responses: Record<string, unknown> = { [CAL_AI_AGENT_PHONE_NUMBER_FIELD]: CALAI_PHONE };
      const result = resolveAndMutatePhoneFieldValues({
        responses,
        isUnifiedPhoneFieldsEnabled: true,
      });
      expect(result.smsReminderNumber).toBe(CALAI_PHONE);
    });

    it("chooses attendee phone over Cal AI agent phone for SMS reminders", () => {
      const responses: Record<string, unknown> = {
        [ATTENDEE_PHONE_NUMBER_FIELD]: PHONE_NUMBER,
        [CAL_AI_AGENT_PHONE_NUMBER_FIELD]: CALAI_PHONE,
      };
      const result = resolveAndMutatePhoneFieldValues({
        responses,
        isUnifiedPhoneFieldsEnabled: true,
      });
      expect(result.smsReminderNumber).toBe(PHONE_NUMBER);
    });

    it("returns no SMS reminder when the booking has no phone number at all", () => {
      const responses: Record<string, unknown> = {};
      const result = resolveAndMutatePhoneFieldValues({
        responses,
        isUnifiedPhoneFieldsEnabled: true,
      });
      expect(result.smsReminderNumber).toBeUndefined();
    });
  });

  describe("resolved attendee phone number for booking display", () => {
    it("returns the booker-submitted attendee phone as-is", () => {
      const responses: Record<string, unknown> = { [ATTENDEE_PHONE_NUMBER_FIELD]: PHONE_NUMBER };
      const result = resolveAndMutatePhoneFieldValues({
        responses,
        isUnifiedPhoneFieldsEnabled: true,
      });
      expect(result.attendeePhoneNumber).toBe(PHONE_NUMBER);
    });

    it("derives attendee phone from other phone sources when not explicitly submitted", () => {
      const responses: Record<string, unknown> = { [SMS_REMINDER_NUMBER_FIELD]: PHONE_NUMBER };
      const result = resolveAndMutatePhoneFieldValues({
        responses,
        bookingFields: unifiedBookingFields,
        isUnifiedPhoneFieldsEnabled: true,
      });
      expect(result.attendeePhoneNumber).toBe(PHONE_NUMBER);
    });

    it("returns no attendee phone when no phone number exists in the booking", () => {
      const responses: Record<string, unknown> = {};
      const result = resolveAndMutatePhoneFieldValues({
        responses,
        bookingFields: unifiedBookingFields,
        isUnifiedPhoneFieldsEnabled: true,
      });
      expect(result.attendeePhoneNumber).toBeUndefined();
    });
  });

  describe("backward compatibility – legacy API v1 requests without responses", () => {
    // Legacy API v1 requests use customInputs instead of responses.
    // getBookingData handles the customInputs path directly (no phone resolution needed).
    // These tests document the function's behavior with minimal/sparse inputs.

    it("returns all phone fields as undefined when responses is an empty object (no phone data submitted)", () => {
      const responses: Record<string, unknown> = {};
      const result = resolveAndMutatePhoneFieldValues({
        responses,
        isUnifiedPhoneFieldsEnabled: false,
      });
      expect(result.smsReminderNumber).toBeUndefined();
      expect(result.attendeePhoneNumber).toBeUndefined();
      expect(result.calAiPhoneNumber).toBeUndefined();
    });

    it("extracts smsReminderNumber from responses when it is the only phone field present (legacy booking pattern)", () => {
      const responses: Record<string, unknown> = {
        [SMS_REMINDER_NUMBER_FIELD]: "+19199999999",
      };
      const result = resolveAndMutatePhoneFieldValues({
        responses,
        isUnifiedPhoneFieldsEnabled: false,
      });
      expect(result.smsReminderNumber).toBe("+19199999999");
      expect(result.attendeePhoneNumber).toBeUndefined();
      expect(result.calAiPhoneNumber).toBeUndefined();
    });

    it("does not mutate responses when no bookingFields are provided (server-side path)", () => {
      const responses: Record<string, unknown> = {
        [SMS_REMINDER_NUMBER_FIELD]: "+19199999999",
      };
      const responsesBefore = { ...responses };
      resolveAndMutatePhoneFieldValues({
        responses,
        isUnifiedPhoneFieldsEnabled: false,
      });
      expect(responses).toEqual(responsesBefore);
    });
  });

  describe("resolved Cal AI agent phone number", () => {
    it("returns the Cal AI phone when the booking was made via a Cal AI agent", () => {
      const responses: Record<string, unknown> = { [CAL_AI_AGENT_PHONE_NUMBER_FIELD]: CALAI_PHONE };
      const result = resolveAndMutatePhoneFieldValues({
        responses,
        bookingFields: unifiedBookingFields,
        isUnifiedPhoneFieldsEnabled: true,
      });
      expect(result.calAiPhoneNumber).toBe(CALAI_PHONE);
    });

    it("returns no Cal AI phone when the booking was not made via a Cal AI agent", () => {
      const responses: Record<string, unknown> = { [SMS_REMINDER_NUMBER_FIELD]: PHONE_NUMBER };
      const result = resolveAndMutatePhoneFieldValues({
        responses,
        isUnifiedPhoneFieldsEnabled: true,
      });
      expect(result.calAiPhoneNumber).toBeUndefined();
    });
  });
});
