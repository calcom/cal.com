import { vi, expect, test, describe } from "vitest";

import { getTranslation } from "@calcom/i18n/server";
import { TimeFormat } from "@calcom/lib/timeFormat";
import { WorkflowActions, WorkflowTemplates } from "@calcom/prisma/enums";

import { getTemplateBodyForAction } from "../actionHelperFunctions";
import compareReminderBodyToTemplate from "../compareReminderBodyToTemplate";
import plainTextReminderTemplates from "../reminders/templates/plainTextTemplates";

const tMock = (key: string, options?: Record<string, unknown>) => {
  const mocks: Record<string, string> = {
    hi: "Hi",
    reminder: "Reminder",
    email_reminder_upcoming_event_notice: "This is a reminder about your upcoming event.",
    event_upper_case: "Event",
    date_and_time: "Date & Time",
    attendees: "Attendees",
    you_and_conjunction: "You &",
    location: "Location",
    scheduling_by: "Scheduling by",
    experience_review_prompt: "How was your experience with",
    improve_customer_experience_message: "We're always looking to improve our customer's experience.",
    meeting_satisfaction_question: "How satisfied were you with your recent meeting?",
    meeting_not_joined_question: "didn't join the meeting?",
    reschedule_cta_short: "Reschedule here.",
    need_to_make_a_change: "Need to make a change?",
    need_to_make_a_change_reschedule_cancel: "Need to make a change? {{rescheduleLink}} or {{cancelLink}}",
    need_to_make_a_change_reschedule: "Need to make a change? {{rescheduleLink}}",
    need_to_make_a_change_cancel: "Need to make a change? {{cancelLink}}",
    reschedule: "Reschedule",
    cancel: "Cancel",
    or_lowercase: "or",
  };
  let result = mocks[key] || key;
  if (options) {
    result = result.replace(/\{\{(\w+)\}\}/g, (_, k) => String(options[k] ?? ""));
  }
  return result;
};

vi.mock("@calcom/i18n/server", () => {
  return {
    getTranslation: async (locale: string, namespace: string) => {
      const t = tMock as any;
      t.locale = locale;
      t.namespace = namespace;
      return t;
    },
  };
});

const translation = async () => tMock as any;

describe("compareReminderBodyToTemplate", () => {
  test("should return true if reminderBody and template are the same", () => {
    const reminderBody = "<p>Test</p>";
    const template = "<p>Test</p>";
    expect(compareReminderBodyToTemplate({ reminderBody, template })).toBe(true);
  });

  test("should return false if reminderBody and template are different", () => {
    const reminderBody = "<p>Test</p>";
    const template = "<p>Test2</p>";
    expect(compareReminderBodyToTemplate({ reminderBody, template })).toBe(false);
  });

  describe("email templates", () => {
    test("reminder with reschedule section", async () => {
      const template = getTemplateBodyForAction({
        action: WorkflowActions.EMAIL_HOST,
        template: WorkflowTemplates.REMINDER,
        timeFormat: TimeFormat.TWELVE_HOUR,
        locale: "en",
        t: await translation(),
        showRescheduleAndCancelSection: true,
      });

      if (!template) throw new Error("template not found");

      const reminderBody = plainTextReminderTemplates.email.reminder;
      expect(compareReminderBodyToTemplate({ reminderBody, template })).toBe(true);
    });

    test("reminder without reschedule section (legacy)", async () => {
      const template = getTemplateBodyForAction({
        action: WorkflowActions.EMAIL_HOST,
        template: WorkflowTemplates.REMINDER,
        timeFormat: TimeFormat.TWELVE_HOUR,
        locale: "en",
        t: await translation(),
        showRescheduleAndCancelSection: false,
      });

      if (!template) throw new Error("template not found");

      // Legacy template should not contain the reschedule section
      expect(template).not.toContain("need_to_make_a_change");
    });

    test("rating", async () => {
      const template = getTemplateBodyForAction({
        action: WorkflowActions.EMAIL_HOST,
        template: WorkflowTemplates.RATING,
        timeFormat: TimeFormat.TWELVE_HOUR,
        locale: "en",
        t: await translation(),
      });

      if (!template) throw new Error("template not found");

      const reminderBody = plainTextReminderTemplates.email?.rating ?? "";
      expect(compareReminderBodyToTemplate({ reminderBody, template })).toBe(true);
    });
  });

  describe("sms templates", () => {
    test("reminder", async () => {
      const template = getTemplateBodyForAction({
        action: WorkflowActions.SMS_ATTENDEE,
        template: WorkflowTemplates.REMINDER,
        timeFormat: TimeFormat.TWELVE_HOUR,
        locale: "en",
        t: await getTranslation("en", "common"),
      });

      if (!template) throw new Error("template not found");

      const reminderBody = plainTextReminderTemplates.sms.reminder;
      expect(compareReminderBodyToTemplate({ reminderBody, template })).toBe(true);
    });
  });

  describe("whatsapp templates", () => {
    test("reminder", async () => {
      const template = getTemplateBodyForAction({
        action: WorkflowActions.WHATSAPP_ATTENDEE,
        template: WorkflowTemplates.REMINDER,
        timeFormat: TimeFormat.TWELVE_HOUR,
        locale: "en",
        t: await getTranslation("en", "common"),
      });

      if (!template) throw new Error("template not found");

      const reminderBody = plainTextReminderTemplates.whatsapp.reminder;
      expect(compareReminderBodyToTemplate({ reminderBody, template })).toBe(true);
    });

    test("rescheduled", async () => {
      const template = getTemplateBodyForAction({
        action: WorkflowActions.WHATSAPP_ATTENDEE,
        template: WorkflowTemplates.RESCHEDULED,
        timeFormat: TimeFormat.TWELVE_HOUR,
        locale: "en",
        t: await getTranslation("en", "common"),
      });

      if (!template) throw new Error("template not found");

      const reminderBody = plainTextReminderTemplates.whatsapp.rescheduled;
      expect(compareReminderBodyToTemplate({ reminderBody, template })).toBe(true);
    });

    test("completed", async () => {
      const template = getTemplateBodyForAction({
        action: WorkflowActions.WHATSAPP_ATTENDEE,
        template: WorkflowTemplates.COMPLETED,
        timeFormat: TimeFormat.TWELVE_HOUR,
        locale: "en",
        t: await getTranslation("en", "common"),
      });

      if (!template) throw new Error("template not found");

      const reminderBody = plainTextReminderTemplates.whatsapp.completed;
      expect(compareReminderBodyToTemplate({ reminderBody, template })).toBe(true);
    });

    test("canceled", async () => {
      const template = getTemplateBodyForAction({
        action: WorkflowActions.WHATSAPP_ATTENDEE,
        template: WorkflowTemplates.CANCELLED,
        timeFormat: TimeFormat.TWELVE_HOUR,
        locale: "en",
        t: await getTranslation("en", "common"),
      });

      if (!template) throw new Error("template not found");

      const reminderBody = plainTextReminderTemplates.whatsapp?.canceled ?? "";
      expect(compareReminderBodyToTemplate({ reminderBody, template })).toBe(true);
    });
  });
});
