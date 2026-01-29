/**
 * Issue #25795: Disabled confirmation emails should be respected for require-confirmation events
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, vi, beforeEach, it } from "vitest";

import { BookingEmailSmsHandler, BookingActionMap } from "./BookingEmailSmsHandler";

const mockSendScheduledEmailsAndSMS = vi.fn().mockResolvedValue(undefined);

vi.mock("@calcom/emails/email-manager", () => ({
  sendScheduledEmailsAndSMS: (...args: any[]) => mockSendScheduledEmailsAndSMS(...args),
}));

describe("handleConfirmation - Issue #25795: disabled confirmation emails respected", () => {
  const mockLogger = { warn: vi.fn(), debug: vi.fn(), error: vi.fn(), getSubLogger: () => mockLogger };

  beforeEach(() => vi.clearAllMocks());

  it("respects disableStandardEmails.confirmation.attendee=true on BOOKING_CONFIRMED", async () => {
    const handler = new BookingEmailSmsHandler({ logger: mockLogger as any });

    await handler.send({
      action: BookingActionMap.confirmed,
      data: {
        evt: { attendees: [] } as any,
        eventType: {
          metadata: { disableStandardEmails: { confirmation: { attendee: true, host: false } } },
          schedulingType: null,
        },
        workflows: [],
        eventNameObject: {} as any,
        additionalInformation: {},
        additionalNotes: null,
        customInputs: null,
      },
    });

    expect(mockSendScheduledEmailsAndSMS).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      false, // isHostConfirmationEmailsDisabled
      true, // isAttendeeConfirmationEmailDisabled - KEY ASSERTION
      expect.anything()
    );
  });

  it("respects disableStandardEmails.confirmation.host=true on BOOKING_CONFIRMED", async () => {
    const handler = new BookingEmailSmsHandler({ logger: mockLogger as any });

    await handler.send({
      action: BookingActionMap.confirmed,
      data: {
        evt: { attendees: [] } as any,
        eventType: {
          metadata: { disableStandardEmails: { confirmation: { attendee: false, host: true } } },
          schedulingType: null,
        },
        workflows: [],
        eventNameObject: {} as any,
        additionalInformation: {},
        additionalNotes: null,
        customInputs: null,
      },
    });

    expect(mockSendScheduledEmailsAndSMS).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      true, // isHostConfirmationEmailsDisabled - KEY ASSERTION
      false, // isAttendeeConfirmationEmailDisabled
      expect.anything()
    );
  });
});
