import { describe, expect, it, vi, beforeEach } from "vitest";

import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";

const mockGetEmailSettings = vi.fn();

vi.mock("@calcom/features/organizations/repositories/OrganizationSettingsRepository", () => ({
  OrganizationSettingsRepository: vi.fn().mockImplementation(() => ({
    getEmailSettings: mockGetEmailSettings,
  })),
}));

vi.mock("@calcom/prisma", () => ({
  prisma: {},
}));

const { shouldSkipAttendeeEmail } = await import("./email-manager");

describe("shouldSkipAttendeeEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.each([
    ["confirmation", "disableAttendeeConfirmationEmail"],
    ["cancellation", "disableAttendeeCancellationEmail"],
    ["rescheduled", "disableAttendeeRescheduledEmail"],
    ["request", "disableAttendeeRequestEmail"],
    ["reassigned", "disableAttendeeReassignedEmail"],
    ["awaiting_payment", "disableAttendeeAwaitingPaymentEmail"],
    ["reschedule_request", "disableAttendeeRescheduleRequestEmail"],
    ["location_change", "disableAttendeeLocationChangeEmail"],
    ["new_event", "disableAttendeeNewEventEmail"],
  ] as const)("Email type: %s", (emailType, settingKey) => {
    it(`should skip email when organization has ${settingKey} enabled`, async () => {
      mockGetEmailSettings.mockResolvedValue({
        disableAttendeeConfirmationEmail: settingKey === "disableAttendeeConfirmationEmail",
        disableAttendeeCancellationEmail: settingKey === "disableAttendeeCancellationEmail",
        disableAttendeeRescheduledEmail: settingKey === "disableAttendeeRescheduledEmail",
        disableAttendeeRequestEmail: settingKey === "disableAttendeeRequestEmail",
        disableAttendeeReassignedEmail: settingKey === "disableAttendeeReassignedEmail",
        disableAttendeeAwaitingPaymentEmail: settingKey === "disableAttendeeAwaitingPaymentEmail",
        disableAttendeeRescheduleRequestEmail: settingKey === "disableAttendeeRescheduleRequestEmail",
        disableAttendeeLocationChangeEmail: settingKey === "disableAttendeeLocationChangeEmail",
        disableAttendeeNewEventEmail: settingKey === "disableAttendeeNewEventEmail",
      });

      const result = await shouldSkipAttendeeEmail(undefined, 123, emailType);
      expect(result).toBe(true);
    });

    it(`should send email when organization has ${settingKey} disabled`, async () => {
      mockGetEmailSettings.mockResolvedValue({
        disableAttendeeConfirmationEmail: false,
        disableAttendeeCancellationEmail: false,
        disableAttendeeRescheduledEmail: false,
        disableAttendeeRequestEmail: false,
        disableAttendeeReassignedEmail: false,
        disableAttendeeAwaitingPaymentEmail: false,
        disableAttendeeRescheduleRequestEmail: false,
        disableAttendeeLocationChangeEmail: false,
        disableAttendeeNewEventEmail: false,
      });

      const result = await shouldSkipAttendeeEmail(undefined, 123, emailType);
      expect(result).toBe(false);
    });
  });

  describe("Metadata fallback", () => {
    it("should skip email when metadata has disableStandardEmails.all.attendee enabled", async () => {
      const metadata: EventTypeMetadata = {
        disableStandardEmails: {
          all: {
            attendee: true,
          },
        },
      };

      const result = await shouldSkipAttendeeEmail(metadata, 123, "confirmation");
      expect(result).toBe(true);
    });
  });

  describe("Priority: organization settings override metadata", () => {
    it("should skip email when org setting is enabled even if metadata allows", async () => {
      mockGetEmailSettings.mockResolvedValue({
        disableAttendeeConfirmationEmail: true,
        disableAttendeeCancellationEmail: false,
        disableAttendeeRescheduledEmail: false,
        disableAttendeeRequestEmail: false,
        disableAttendeeReassignedEmail: false,
        disableAttendeeAwaitingPaymentEmail: false,
        disableAttendeeRescheduleRequestEmail: false,
        disableAttendeeLocationChangeEmail: false,
        disableAttendeeNewEventEmail: false,
      });

      const metadata: EventTypeMetadata = {
        disableStandardEmails: {
          confirmation: {
            attendee: false,
          },
        },
      };

      const result = await shouldSkipAttendeeEmail(metadata, 123, "confirmation");
      expect(result).toBe(true);
    });
  });

  describe("Edge cases", () => {
    it("should send email when organizationId is null", async () => {
      const result = await shouldSkipAttendeeEmail(undefined, null, "confirmation");
      expect(result).toBe(false);
    });

    it("should send email when emailType is undefined", async () => {
      mockGetEmailSettings.mockResolvedValue({
        disableAttendeeConfirmationEmail: true,
        disableAttendeeCancellationEmail: false,
        disableAttendeeRescheduledEmail: false,
        disableAttendeeRequestEmail: false,
        disableAttendeeReassignedEmail: false,
        disableAttendeeAwaitingPaymentEmail: false,
        disableAttendeeRescheduleRequestEmail: false,
        disableAttendeeLocationChangeEmail: false,
        disableAttendeeNewEventEmail: false,
      });

      const result = await shouldSkipAttendeeEmail(undefined, 123, undefined);
      expect(result).toBe(false);
    });

    it("should send email when metadata is undefined and org settings are disabled", async () => {
      mockGetEmailSettings.mockResolvedValue({
        disableAttendeeConfirmationEmail: false,
        disableAttendeeCancellationEmail: false,
        disableAttendeeRescheduledEmail: false,
        disableAttendeeRequestEmail: false,
        disableAttendeeReassignedEmail: false,
        disableAttendeeAwaitingPaymentEmail: false,
        disableAttendeeRescheduleRequestEmail: false,
        disableAttendeeLocationChangeEmail: false,
        disableAttendeeNewEventEmail: false,
      });

      const result = await shouldSkipAttendeeEmail(undefined, 123, "confirmation");
      expect(result).toBe(false);
    });
  });
});
