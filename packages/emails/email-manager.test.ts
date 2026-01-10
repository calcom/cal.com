import { describe, expect, it, vi, beforeEach } from "vitest";

import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";

import { shouldSkipAttendeeEmailWithSettings, fetchOrganizationEmailSettings } from "./email-manager";

const mockGetEmailSettings = vi.fn();

vi.mock("@calcom/features/organizations/repositories/OrganizationSettingsRepository", () => ({
  OrganizationSettingsRepository: vi.fn().mockImplementation(() => ({
    getEmailSettings: mockGetEmailSettings,
  })),
}));

vi.mock("@calcom/prisma", () => ({
  prisma: {},
}));

describe("shouldSkipAttendeeEmailWithSettings", () => {
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
      const orgSettings = {
        disableAttendeeConfirmationEmail: settingKey === "disableAttendeeConfirmationEmail",
        disableAttendeeCancellationEmail: settingKey === "disableAttendeeCancellationEmail",
        disableAttendeeRescheduledEmail: settingKey === "disableAttendeeRescheduledEmail",
        disableAttendeeRequestEmail: settingKey === "disableAttendeeRequestEmail",
        disableAttendeeReassignedEmail: settingKey === "disableAttendeeReassignedEmail",
        disableAttendeeAwaitingPaymentEmail: settingKey === "disableAttendeeAwaitingPaymentEmail",
        disableAttendeeRescheduleRequestEmail: settingKey === "disableAttendeeRescheduleRequestEmail",
        disableAttendeeLocationChangeEmail: settingKey === "disableAttendeeLocationChangeEmail",
        disableAttendeeNewEventEmail: settingKey === "disableAttendeeNewEventEmail",
      };

      const result = shouldSkipAttendeeEmailWithSettings(undefined, orgSettings, emailType);
      expect(result).toBe(true);
    });

    it(`should send email when organization has ${settingKey} disabled`, async () => {
      const orgSettings = {
        disableAttendeeConfirmationEmail: false,
        disableAttendeeCancellationEmail: false,
        disableAttendeeRescheduledEmail: false,
        disableAttendeeRequestEmail: false,
        disableAttendeeReassignedEmail: false,
        disableAttendeeAwaitingPaymentEmail: false,
        disableAttendeeRescheduleRequestEmail: false,
        disableAttendeeLocationChangeEmail: false,
        disableAttendeeNewEventEmail: false,
      };

      const result = shouldSkipAttendeeEmailWithSettings(undefined, orgSettings, emailType);
      expect(result).toBe(false);
    });
  });

  describe("Metadata fallback", () => {
    it("should skip email when metadata has disableStandardEmails.all.attendee enabled", () => {
      const metadata: EventTypeMetadata = {
        disableStandardEmails: {
          all: {
            attendee: true,
          },
        },
      };

      const result = shouldSkipAttendeeEmailWithSettings(metadata, null, "confirmation");
      expect(result).toBe(true);
    });
  });

  describe("Priority: organization settings override metadata", () => {
    it("should skip email when org setting is enabled even if metadata allows", () => {
      const orgSettings = {
        disableAttendeeConfirmationEmail: true,
        disableAttendeeCancellationEmail: false,
        disableAttendeeRescheduledEmail: false,
        disableAttendeeRequestEmail: false,
        disableAttendeeReassignedEmail: false,
        disableAttendeeAwaitingPaymentEmail: false,
        disableAttendeeRescheduleRequestEmail: false,
        disableAttendeeLocationChangeEmail: false,
        disableAttendeeNewEventEmail: false,
      };

      const metadata: EventTypeMetadata = {
        disableStandardEmails: {
          confirmation: {
            attendee: false,
          },
        },
      };

      const result = shouldSkipAttendeeEmailWithSettings(metadata, orgSettings, "confirmation");
      expect(result).toBe(true);
    });
  });

  describe("Edge cases", () => {
    it("should send email when organizationSettings is null", () => {
      const result = shouldSkipAttendeeEmailWithSettings(undefined, null, "confirmation");
      expect(result).toBe(false);
    });

    it("should send email when emailType is undefined", () => {
      const orgSettings = {
        disableAttendeeConfirmationEmail: true,
        disableAttendeeCancellationEmail: false,
        disableAttendeeRescheduledEmail: false,
        disableAttendeeRequestEmail: false,
        disableAttendeeReassignedEmail: false,
        disableAttendeeAwaitingPaymentEmail: false,
        disableAttendeeRescheduleRequestEmail: false,
        disableAttendeeLocationChangeEmail: false,
        disableAttendeeNewEventEmail: false,
      };

      const result = shouldSkipAttendeeEmailWithSettings(undefined, orgSettings, undefined);
      expect(result).toBe(false);
    });

    it("should send email when metadata is undefined and org settings are disabled", () => {
      const orgSettings = {
        disableAttendeeConfirmationEmail: false,
        disableAttendeeCancellationEmail: false,
        disableAttendeeRescheduledEmail: false,
        disableAttendeeRequestEmail: false,
        disableAttendeeReassignedEmail: false,
        disableAttendeeAwaitingPaymentEmail: false,
        disableAttendeeRescheduleRequestEmail: false,
        disableAttendeeLocationChangeEmail: false,
        disableAttendeeNewEventEmail: false,
      };

      const result = shouldSkipAttendeeEmailWithSettings(undefined, orgSettings, "confirmation");
      expect(result).toBe(false);
    });
  });
});
