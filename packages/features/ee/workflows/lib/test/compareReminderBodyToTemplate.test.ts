import { createInstance } from "i18next";
import { vi, expect, test, describe } from "vitest";

import { getTranslation } from "@calcom/lib/server/i18n";
import { TimeFormat } from "@calcom/lib/timeFormat";
import { WorkflowActions, WorkflowTemplates } from "@calcom/prisma/enums";
import en from "@calcom/web/public/static/locales/en/common.json";

import { getTemplateBodyForAction } from "../actionHelperFunctions";
import compareReminderBodyToTemplate from "../compareReminderBodyToTemplate";
import plainTextReminderTemplates from "../reminders/templates/plainTextTemplates";

vi.mock("@calcom/lib/server/i18n", () => {
  return {
    getTranslation: async (locale: string, namespace: string) => {
      const t = (key: string) => key;
      t.locale = locale;
      t.namespace = namespace;
      return t;
    },
  };
});

const translation = async () => {
  const _i18n = createInstance();
  await _i18n.init({
    lng: "en",
    resources: {
      en: {
        translation: en,
      },
    },
  });
  return _i18n.getFixedT("en");
};

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
    test("reminder", async () => {
      const template = getTemplateBodyForAction({
        action: WorkflowActions.EMAIL_HOST,
        template: WorkflowTemplates.REMINDER,
        timeFormat: TimeFormat.TWELVE_HOUR,
        locale: "en",
        t: await translation(),
      });

      if (!template) throw new Error("template not found");

      const reminderBody = plainTextReminderTemplates.email.reminder;
      expect(compareReminderBodyToTemplate({ reminderBody, template })).toBe(true);
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
