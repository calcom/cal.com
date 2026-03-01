import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./templates/credit-balance-limit-reached-email", () => {
  const cls = vi.fn();
  cls.prototype.sendEmail = vi.fn(() => Promise.resolve());
  return { default: cls };
});

vi.mock("./templates/credit-balance-low-warning-email", () => {
  const cls = vi.fn();
  cls.prototype.sendEmail = vi.fn(() => Promise.resolve());
  return { default: cls };
});

vi.mock("./templates/no-show-fee-charged-email", () => {
  const cls = vi.fn();
  cls.prototype.sendEmail = vi.fn(() => Promise.resolve());
  return { default: cls };
});

vi.mock("./templates/organizer-payment-refund-failed-email", () => {
  const cls = vi.fn();
  cls.prototype.sendEmail = vi.fn(() => Promise.resolve());
  return { default: cls };
});

vi.mock("./templates/proration-invoice-email", () => {
  const cls = vi.fn();
  cls.prototype.sendEmail = vi.fn(() => Promise.resolve());
  return { default: cls };
});

vi.mock("./templates/proration-reminder-email", () => {
  const cls = vi.fn();
  cls.prototype.sendEmail = vi.fn(() => Promise.resolve());
  return { default: cls };
});

import {
  sendCreditBalanceLimitReachedEmails,
  sendCreditBalanceLowWarningEmails,
  sendNoShowFeeChargedEmail,
  sendOrganizerPaymentRefundFailedEmail,
  sendProrationInvoiceEmails,
  sendProrationReminderEmails,
} from "./billing-email-service";
import CreditBalanceLimitReachedEmail from "./templates/credit-balance-limit-reached-email";
import CreditBalanceLowWarningEmail from "./templates/credit-balance-low-warning-email";
import NoShowFeeChargedEmail from "./templates/no-show-fee-charged-email";
import OrganizerPaymentRefundFailedEmail from "./templates/organizer-payment-refund-failed-email";
import ProrationInvoiceEmail from "./templates/proration-invoice-email";
import ProrationReminderEmail from "./templates/proration-reminder-email";

const createCalEvent = (): CalendarEvent =>
  ({
    title: "Meeting",
    organizer: {
      email: "org@t.com",
      name: "Org",
      language: { translate: vi.fn(), locale: "en" },
      timeZone: "UTC",
    },
    attendees: [
      {
        email: "a@t.com",
        name: "Attendee",
        language: { translate: vi.fn(), locale: "en" },
        timeZone: "UTC",
      },
    ],
  }) as unknown as CalendarEvent;

const createAdmin = (id: number) => ({
  id,
  name: `Admin ${id}`,
  email: `admin${id}@t.com`,
  t: vi.fn((key: string) => key),
});

describe("billing-email-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendOrganizerPaymentRefundFailedEmail", () => {
    it("sends email for organizer", async () => {
      const evt = createCalEvent();
      await sendOrganizerPaymentRefundFailedEmail(evt);
      expect(OrganizerPaymentRefundFailedEmail).toHaveBeenCalledWith({ calEvent: evt });
      expect(OrganizerPaymentRefundFailedEmail.prototype.sendEmail).toHaveBeenCalled();
    });

    it("sends email for each team member", async () => {
      const evt = {
        ...createCalEvent(),
        team: {
          name: "Team",
          members: [
            {
              email: "m1@t.com",
              name: "M1",
              timeZone: "UTC",
              language: { translate: vi.fn(), locale: "en" },
            },
            {
              email: "m2@t.com",
              name: "M2",
              timeZone: "UTC",
              language: { translate: vi.fn(), locale: "en" },
            },
          ],
        },
      } as unknown as CalendarEvent;
      await sendOrganizerPaymentRefundFailedEmail(evt);
      // 1 organizer + 2 team members = 3
      expect(OrganizerPaymentRefundFailedEmail).toHaveBeenCalledTimes(3);
    });
  });

  describe("sendNoShowFeeChargedEmail", () => {
    it("sends email to attendee", async () => {
      const evt = createCalEvent();
      const attendee = { email: "a@t.com", name: "A", timeZone: "UTC" } as Person;
      await sendNoShowFeeChargedEmail(attendee, evt);
      expect(NoShowFeeChargedEmail).toHaveBeenCalledWith(evt, attendee);
      expect(NoShowFeeChargedEmail.prototype.sendEmail).toHaveBeenCalled();
    });

    it("skips email when attendee emails are disabled via metadata", async () => {
      const evt = createCalEvent();
      const attendee = { email: "a@t.com", name: "A", timeZone: "UTC" } as Person;
      const metadata = { disableStandardEmails: { all: { attendee: true } } };
      await sendNoShowFeeChargedEmail(attendee, evt, metadata);
      expect(NoShowFeeChargedEmail).not.toHaveBeenCalled();
    });
  });

  describe("sendCreditBalanceLowWarningEmails", () => {
    it("sends email to each team admin", async () => {
      await sendCreditBalanceLowWarningEmails({
        team: {
          name: "Team",
          id: 1,
          adminAndOwners: [createAdmin(1), createAdmin(2)],
        },
        balance: 10,
      });
      expect(CreditBalanceLowWarningEmail).toHaveBeenCalledTimes(2);
    });

    it("sends email to individual user", async () => {
      await sendCreditBalanceLowWarningEmails({
        user: { id: 1, name: "User", email: "u@t.com", t: vi.fn() },
        balance: 5,
      });
      expect(CreditBalanceLowWarningEmail).toHaveBeenCalledTimes(1);
    });

    it("returns early when no team admins and no user", async () => {
      await sendCreditBalanceLowWarningEmails({ balance: 10 });
      expect(CreditBalanceLowWarningEmail).not.toHaveBeenCalled();
    });

    it("returns early when team has empty adminAndOwners", async () => {
      await sendCreditBalanceLowWarningEmails({
        team: { name: "Team", id: 1, adminAndOwners: [] },
        balance: 10,
      });
      expect(CreditBalanceLowWarningEmail).not.toHaveBeenCalled();
    });
  });

  describe("sendCreditBalanceLimitReachedEmails", () => {
    it("sends email to each team admin", async () => {
      await sendCreditBalanceLimitReachedEmails({
        team: {
          name: "Team",
          id: 1,
          adminAndOwners: [createAdmin(1), createAdmin(2)],
        },
      });
      expect(CreditBalanceLimitReachedEmail).toHaveBeenCalledTimes(2);
    });

    it("sends email to individual user", async () => {
      await sendCreditBalanceLimitReachedEmails({
        user: { id: 1, name: "User", email: "u@t.com", t: vi.fn() },
      });
      expect(CreditBalanceLimitReachedEmail).toHaveBeenCalledTimes(1);
    });

    it("returns early when no team admins and no user", async () => {
      await sendCreditBalanceLimitReachedEmails({});
      expect(CreditBalanceLimitReachedEmail).not.toHaveBeenCalled();
    });
  });

  describe("sendProrationInvoiceEmails", () => {
    it("sends email to each admin", async () => {
      await sendProrationInvoiceEmails({
        team: { id: 1, name: "Team" },
        proration: { monthKey: "2024-01", netSeatIncrease: 5, proratedAmount: 100 },
        invoiceUrl: "https://stripe.com/invoice/123",
        isAutoCharge: false,
        adminAndOwners: [createAdmin(1), createAdmin(2)],
      });
      expect(ProrationInvoiceEmail).toHaveBeenCalledTimes(2);
    });

    it("returns early when adminAndOwners is empty", async () => {
      await sendProrationInvoiceEmails({
        team: { id: 1, name: "Team" },
        proration: { monthKey: "2024-01", netSeatIncrease: 5, proratedAmount: 100 },
        isAutoCharge: false,
        adminAndOwners: [],
      });
      expect(ProrationInvoiceEmail).not.toHaveBeenCalled();
    });
  });

  describe("sendProrationReminderEmails", () => {
    it("sends email to each admin", async () => {
      await sendProrationReminderEmails({
        team: { id: 1, name: "Team" },
        proration: { monthKey: "2024-01", netSeatIncrease: 5, proratedAmount: 100 },
        invoiceUrl: "https://stripe.com/invoice/123",
        adminAndOwners: [createAdmin(1), createAdmin(2), createAdmin(3)],
      });
      expect(ProrationReminderEmail).toHaveBeenCalledTimes(3);
    });

    it("returns early when adminAndOwners is empty", async () => {
      await sendProrationReminderEmails({
        team: { id: 1, name: "Team" },
        proration: { monthKey: "2024-01", netSeatIncrease: 5, proratedAmount: 100 },
        adminAndOwners: [],
      });
      expect(ProrationReminderEmail).not.toHaveBeenCalled();
    });
  });
});
