import { TimeFormat } from "@calcom/lib/timeFormat";
import { WorkflowActions } from "@calcom/prisma/enums";
import type { TFunction } from "i18next";
import { describe, expect, test, vi } from "vitest";
import emailReminderTemplate from "./emailReminderTemplate";

vi.mock("@calcom/app-store/locations", () => ({
  guessEventLocationType: vi.fn().mockReturnValue(null),
}));

vi.mock("@calcom/lib/constants", async () => {
  const actual = await vi.importActual<typeof import("@calcom/lib/constants")>("@calcom/lib/constants");
  return {
    ...actual,
    APP_NAME: "Cal.com",
  };
});

const mockT = ((key: string) => key) as TFunction;

describe("emailReminderTemplate", () => {
  const baseParams = {
    isEditingMode: false,
    locale: "en",
    t: mockT,
    action: WorkflowActions.EMAIL_ATTENDEE,
    timeFormat: TimeFormat.TWELVE_HOUR,
    startTime: "2024-12-01T10:00:00Z",
    endTime: "2024-12-01T11:00:00Z",
    eventName: "Test Meeting",
    timeZone: "UTC",
    location: "Google Meet",
    otherPerson: "Organizer Name",
    name: "Attendee Name",
    isBrandingDisabled: false,
  };

  describe("reschedule and cancel links", () => {
    test("should include reschedule and cancel section in the email body when links are provided", () => {
      const cancelLink = "https://cal.com/booking/uid-123?cancel=true&cancelledBy=attendee%40example.com";
      const rescheduleLink = "https://cal.com/reschedule/uid-123?rescheduledBy=attendee%40example.com";

      const result = emailReminderTemplate({
        ...baseParams,
        cancelLink,
        rescheduleLink,
      });

      expect(result.emailBody).toContain("need_to_make_a_change_reschedule_cancel");
    });

    test("should include reschedule/cancel section in editing mode when showRescheduleAndCancelSection is true", () => {
      const result = emailReminderTemplate({
        ...baseParams,
        isEditingMode: true,
        showRescheduleAndCancelSection: true,
      });

      expect(result.emailBody).toContain("need_to_make_a_change_reschedule_cancel");
    });

    test("should omit reschedule/cancel section in editing mode when showRescheduleAndCancelSection is not set", () => {
      const result = emailReminderTemplate({
        ...baseParams,
        isEditingMode: true,
      });

      expect(result.emailBody).not.toContain('href="{RESCHEDULE_URL}"');
      expect(result.emailBody).not.toContain('href="{CANCEL_URL}"');
      expect(result.emailBody).not.toContain("need_to_make_a_change");
    });

    test("should omit reschedule/cancel section when links are not provided", () => {
      const result = emailReminderTemplate({
        ...baseParams,
      });

      expect(result.emailBody).not.toContain("need_to_make_a_change");
      expect(result.emailBody).not.toContain("reschedule");
      expect(result.emailBody).not.toContain("cancel");
    });

    test("should place reschedule/cancel section after location section", () => {
      const cancelLink = "https://cal.com/booking/uid-123?cancel=true";
      const rescheduleLink = "https://cal.com/reschedule/uid-123";

      const result = emailReminderTemplate({
        ...baseParams,
        cancelLink,
        rescheduleLink,
      });

      const locationIndex = result.emailBody.indexOf("location");
      const rescheduleIndex = result.emailBody.indexOf("need_to_make_a_change");
      expect(rescheduleIndex).toBeGreaterThan(locationIndex);
    });

    test("should use correct variable names for EMAIL_HOST action in editing mode", () => {
      const result = emailReminderTemplate({
        ...baseParams,
        isEditingMode: true,
        action: WorkflowActions.EMAIL_HOST,
        showRescheduleAndCancelSection: true,
      });

      expect(result.emailBody).toContain("{ORGANIZER}");
      expect(result.emailBody).toContain("{ATTENDEE}");
      expect(result.emailBody).toContain("need_to_make_a_change_reschedule_cancel");
    });
  });
});
