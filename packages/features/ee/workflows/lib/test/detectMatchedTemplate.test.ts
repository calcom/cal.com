import { WorkflowTemplates } from "@calcom/prisma/enums";
import { describe, expect, test } from "vitest";
import { type DefaultTemplates, detectMatchedTemplate } from "../detectMatchedTemplate";

const createDefaultTemplates = (overrides?: Partial<DefaultTemplates>): DefaultTemplates => ({
  reminder: {
    body: "Default reminder body content",
    subject: "Default reminder subject",
  },
  rating: {
    body: "Default rating body content",
    subject: "Default rating subject",
  },
  ...overrides,
});

describe("detectMatchedTemplate", () => {
  describe("when emailBody is empty", () => {
    test("returns REMINDER when template is REMINDER", () => {
      const result = detectMatchedTemplate({
        emailBody: "",
        emailSubject: "Any subject",
        template: WorkflowTemplates.REMINDER,
        defaultTemplates: createDefaultTemplates(),
      });

      expect(result).toBe(WorkflowTemplates.REMINDER);
    });

    test("returns RATING when template is RATING", () => {
      const result = detectMatchedTemplate({
        emailBody: "",
        emailSubject: "Any subject",
        template: WorkflowTemplates.RATING,
        defaultTemplates: createDefaultTemplates(),
      });

      expect(result).toBe(WorkflowTemplates.RATING);
    });

    test("returns null when template is CUSTOM", () => {
      const result = detectMatchedTemplate({
        emailBody: "",
        emailSubject: "Any subject",
        template: WorkflowTemplates.CUSTOM,
        defaultTemplates: createDefaultTemplates(),
      });

      expect(result).toBeNull();
    });

    test("returns null when template is undefined", () => {
      const result = detectMatchedTemplate({
        emailBody: "",
        emailSubject: "Any subject",
        template: undefined,
        defaultTemplates: createDefaultTemplates(),
      });

      expect(result).toBeNull();
    });
  });

  describe("when emailBody exists", () => {
    describe("REMINDER template matching", () => {
      test("returns REMINDER when both body AND subject match default", () => {
        const defaultTemplates = createDefaultTemplates();

        const result = detectMatchedTemplate({
          emailBody: defaultTemplates.reminder.body!,
          emailSubject: defaultTemplates.reminder.subject!,
          template: WorkflowTemplates.REMINDER,
          defaultTemplates,
        });

        expect(result).toBe(WorkflowTemplates.REMINDER);
      });

      test("returns null when body matches but subject is customized", () => {
        const defaultTemplates = createDefaultTemplates();

        const result = detectMatchedTemplate({
          emailBody: defaultTemplates.reminder.body!,
          emailSubject: "Custom subject",
          template: WorkflowTemplates.REMINDER,
          defaultTemplates,
        });

        expect(result).toBeNull();
      });

      test("returns null when subject matches but body is customized", () => {
        const defaultTemplates = createDefaultTemplates();

        const result = detectMatchedTemplate({
          emailBody: "Custom body content",
          emailSubject: defaultTemplates.reminder.subject!,
          template: WorkflowTemplates.REMINDER,
          defaultTemplates,
        });

        expect(result).toBeNull();
      });

      test("returns null when both body and subject are customized", () => {
        const defaultTemplates = createDefaultTemplates();

        const result = detectMatchedTemplate({
          emailBody: "Custom body content",
          emailSubject: "Custom subject",
          template: WorkflowTemplates.REMINDER,
          defaultTemplates,
        });

        expect(result).toBeNull();
      });

      test("matches body with HTML stripped (body has HTML tags)", () => {
        const defaultTemplates = createDefaultTemplates({
          reminder: {
            body: "Plain text reminder body",
            subject: "Default reminder subject",
          },
        });

        const result = detectMatchedTemplate({
          emailBody: "<p>Plain text reminder body</p>",
          emailSubject: defaultTemplates.reminder.subject!,
          template: WorkflowTemplates.REMINDER,
          defaultTemplates,
        });

        expect(result).toBe(WorkflowTemplates.REMINDER);
      });

      test("matches body with HTML stripped (template has HTML tags)", () => {
        const defaultTemplates = createDefaultTemplates({
          reminder: {
            body: "<div>Plain text reminder body</div>",
            subject: "Default reminder subject",
          },
        });

        const result = detectMatchedTemplate({
          emailBody: "Plain text reminder body",
          emailSubject: defaultTemplates.reminder.subject!,
          template: WorkflowTemplates.REMINDER,
          defaultTemplates,
        });

        expect(result).toBe(WorkflowTemplates.REMINDER);
      });
    });

    describe("RATING template matching", () => {
      test("returns RATING when both body AND subject match default", () => {
        const defaultTemplates = createDefaultTemplates();

        const result = detectMatchedTemplate({
          emailBody: defaultTemplates.rating.body!,
          emailSubject: defaultTemplates.rating.subject!,
          template: WorkflowTemplates.RATING,
          defaultTemplates,
        });

        expect(result).toBe(WorkflowTemplates.RATING);
      });

      test("returns null when body matches but subject is customized", () => {
        const defaultTemplates = createDefaultTemplates();

        const result = detectMatchedTemplate({
          emailBody: defaultTemplates.rating.body!,
          emailSubject: "Custom rating subject",
          template: WorkflowTemplates.RATING,
          defaultTemplates,
        });

        expect(result).toBeNull();
      });

      test("returns null when subject matches but body is customized", () => {
        const defaultTemplates = createDefaultTemplates();

        const result = detectMatchedTemplate({
          emailBody: "Custom rating body",
          emailSubject: defaultTemplates.rating.subject!,
          template: WorkflowTemplates.RATING,
          defaultTemplates,
        });

        expect(result).toBeNull();
      });
    });

    describe("template detection regardless of template field value", () => {
      test("detects REMINDER even when template field is CUSTOM", () => {
        const defaultTemplates = createDefaultTemplates();

        const result = detectMatchedTemplate({
          emailBody: defaultTemplates.reminder.body!,
          emailSubject: defaultTemplates.reminder.subject!,
          template: WorkflowTemplates.CUSTOM,
          defaultTemplates,
        });

        expect(result).toBe(WorkflowTemplates.REMINDER);
      });

      test("detects RATING even when template field is CUSTOM", () => {
        const defaultTemplates = createDefaultTemplates();

        const result = detectMatchedTemplate({
          emailBody: defaultTemplates.rating.body!,
          emailSubject: defaultTemplates.rating.subject!,
          template: WorkflowTemplates.CUSTOM,
          defaultTemplates,
        });

        expect(result).toBe(WorkflowTemplates.RATING);
      });

      test("detects REMINDER even when template field is RATING", () => {
        const defaultTemplates = createDefaultTemplates();

        const result = detectMatchedTemplate({
          emailBody: defaultTemplates.reminder.body!,
          emailSubject: defaultTemplates.reminder.subject!,
          template: WorkflowTemplates.RATING,
          defaultTemplates,
        });

        expect(result).toBe(WorkflowTemplates.REMINDER);
      });
    });

    describe("edge cases", () => {
      test("returns null when default body is null", () => {
        const defaultTemplates = createDefaultTemplates({
          reminder: { body: null, subject: "Default reminder subject" },
          rating: { body: null, subject: "Default rating subject" },
        });

        const result = detectMatchedTemplate({
          emailBody: "Some body content",
          emailSubject: "Default reminder subject",
          template: WorkflowTemplates.REMINDER,
          defaultTemplates,
        });

        expect(result).toBeNull();
      });

      test("returns null when default subject is null", () => {
        const defaultTemplates = createDefaultTemplates({
          reminder: { body: "Default reminder body", subject: null },
          rating: { body: "Default rating body", subject: null },
        });

        const result = detectMatchedTemplate({
          emailBody: "Default reminder body",
          emailSubject: "Some subject",
          template: WorkflowTemplates.REMINDER,
          defaultTemplates,
        });

        expect(result).toBeNull();
      });

      test("handles &amp; entity in body comparison", () => {
        const defaultTemplates = createDefaultTemplates({
          reminder: {
            body: "Date & Time",
            subject: "Default reminder subject",
          },
        });

        const result = detectMatchedTemplate({
          emailBody: "Date &amp; Time",
          emailSubject: defaultTemplates.reminder.subject!,
          template: WorkflowTemplates.REMINDER,
          defaultTemplates,
        });

        expect(result).toBe(WorkflowTemplates.REMINDER);
      });

      test("prioritizes REMINDER over RATING when both could match", () => {
        const defaultTemplates = createDefaultTemplates({
          reminder: { body: "Same body", subject: "Same subject" },
          rating: { body: "Same body", subject: "Same subject" },
        });

        const result = detectMatchedTemplate({
          emailBody: "Same body",
          emailSubject: "Same subject",
          template: WorkflowTemplates.RATING,
          defaultTemplates,
        });

        expect(result).toBe(WorkflowTemplates.REMINDER);
      });
    });
  });
});
