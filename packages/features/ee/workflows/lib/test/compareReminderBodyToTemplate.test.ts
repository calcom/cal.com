import { expect, test, describe } from "vitest";

import { TimeFormat } from "@calcom/lib/timeFormat";
import { WorkflowActions, WorkflowTemplates } from "@calcom/prisma/enums";

import { getTemplateBodyForAction } from "../actionHelperFunctions";
import compareReminderBodyToTemplate from "../compareReminderBodyToTemplate";
import plainTextReminderTemplates from "../reminders/templates/plainTextTemplates";

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
    test("reminder", () => {
      const template = getTemplateBodyForAction({
        action: WorkflowActions.EMAIL_HOST,
        template: WorkflowTemplates.REMINDER,
        timeFormat: TimeFormat.TWELVE_HOUR,
        locale: "en",
      });

      if (!template) throw new Error("template not found");

      const reminderBody = plainTextReminderTemplates.email.reminder;
      expect(compareReminderBodyToTemplate({ reminderBody, template })).toBe(true);
    });

    test("rating", () => {
      const template = getTemplateBodyForAction({
        action: WorkflowActions.EMAIL_HOST,
        template: WorkflowTemplates.RATING,
        timeFormat: TimeFormat.TWELVE_HOUR,
        locale: "en",
      });

      if (!template) throw new Error("template not found");

      const reminderBody = plainTextReminderTemplates.email?.rating ?? "";
      expect(compareReminderBodyToTemplate({ reminderBody, template })).toBe(true);
    });
  });

  describe("sms templates", () => {
    test("reminder", () => {
      const template = getTemplateBodyForAction({
        action: WorkflowActions.SMS_ATTENDEE,
        template: WorkflowTemplates.REMINDER,
        timeFormat: TimeFormat.TWELVE_HOUR,
        locale: "en",
      });

      if (!template) throw new Error("template not found");

      const reminderBody = plainTextReminderTemplates.sms.reminder;
      expect(compareReminderBodyToTemplate({ reminderBody, template })).toBe(true);
    });
  });

  describe("whatsapp templates", () => {
    test("reminder", () => {
      const template = getTemplateBodyForAction({
        action: WorkflowActions.WHATSAPP_ATTENDEE,
        template: WorkflowTemplates.REMINDER,
        timeFormat: TimeFormat.TWELVE_HOUR,
        locale: "en",
      });

      if (!template) throw new Error("template not found");

      const reminderBody = plainTextReminderTemplates.whatsapp.reminder;
      expect(compareReminderBodyToTemplate({ reminderBody, template })).toBe(true);
    });

    test("rescheduled", () => {
      const template = getTemplateBodyForAction({
        action: WorkflowActions.WHATSAPP_ATTENDEE,
        template: WorkflowTemplates.RESCHEDULED,
        timeFormat: TimeFormat.TWELVE_HOUR,
        locale: "en",
      });

      if (!template) throw new Error("template not found");

      const reminderBody = plainTextReminderTemplates.whatsapp.rescheduled;
      expect(compareReminderBodyToTemplate({ reminderBody, template })).toBe(true);
    });

    test("completed", () => {
      const template = getTemplateBodyForAction({
        action: WorkflowActions.WHATSAPP_ATTENDEE,
        template: WorkflowTemplates.COMPLETED,
        timeFormat: TimeFormat.TWELVE_HOUR,
        locale: "en",
      });

      if (!template) throw new Error("template not found");

      const reminderBody = plainTextReminderTemplates.whatsapp.completed;
      expect(compareReminderBodyToTemplate({ reminderBody, template })).toBe(true);
    });

    test("canceled", () => {
      const template = getTemplateBodyForAction({
        action: WorkflowActions.WHATSAPP_ATTENDEE,
        template: WorkflowTemplates.CANCELLED,
        timeFormat: TimeFormat.TWELVE_HOUR,
        locale: "en",
      });

      if (!template) throw new Error("template not found");

      const reminderBody = plainTextReminderTemplates.whatsapp?.canceled ?? "";
      expect(compareReminderBodyToTemplate({ reminderBody, template })).toBe(true);
    });
  });
});
