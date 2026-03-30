import type BaseEmail from "@calcom/emails/templates/_base-email";
import type { CreditUsageType } from "@calcom/prisma/enums";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import type { TFunction } from "i18next";
import CreditBalanceLimitReachedEmail from "./templates/credit-balance-limit-reached-email";
import CreditBalanceLowWarningEmail from "./templates/credit-balance-low-warning-email";
import NoShowFeeChargedEmail from "./templates/no-show-fee-charged-email";
import OrganizerPaymentRefundFailedEmail from "./templates/organizer-payment-refund-failed-email";
import ProrationInvoiceEmail from "./templates/proration-invoice-email";
import ProrationReminderEmail from "./templates/proration-reminder-email";

const sendEmail = (prepare: () => BaseEmail) => {
  return new Promise((resolve, reject) => {
    try {
      const email = prepare();
      resolve(email.sendEmail());
    } catch (e) {
      reject(console.error(`${prepare.constructor.name}.sendEmail failed`, e));
    }
  });
};

const eventTypeDisableAttendeeEmail = (metadata?: EventTypeMetadata) => {
  return !!metadata?.disableStandardEmails?.all?.attendee;
};

export const sendOrganizerPaymentRefundFailedEmail = async (calEvent: CalendarEvent) => {
  const emailsToSend: Promise<unknown>[] = [];
  emailsToSend.push(sendEmail(() => new OrganizerPaymentRefundFailedEmail({ calEvent })));

  if (calEvent.team?.members) {
    for (const teamMember of calEvent.team.members) {
      emailsToSend.push(sendEmail(() => new OrganizerPaymentRefundFailedEmail({ calEvent, teamMember })));
    }
  }

  await Promise.all(emailsToSend);
};

export const sendNoShowFeeChargedEmail = async (
  attendee: Person,
  evt: CalendarEvent,
  eventTypeMetadata?: EventTypeMetadata
) => {
  if (eventTypeDisableAttendeeEmail(eventTypeMetadata)) return;
  await sendEmail(() => new NoShowFeeChargedEmail(evt, attendee));
};

export const sendCreditBalanceLowWarningEmails = async (input: {
  team?: {
    name: string | null;
    id: number;
    adminAndOwners: {
      id: number;
      name: string | null;
      email: string;
      t: TFunction;
    }[];
  };
  user?: {
    id: number;
    name: string | null;
    email: string;
    t: TFunction;
  };
  balance: number;
  creditFor?: CreditUsageType;
}) => {
  const { team, balance, user, creditFor } = input;
  if ((!team || !team.adminAndOwners.length) && !user) return;

  if (team) {
    const emailsToSend: Promise<unknown>[] = [];

    for (const admin of team.adminAndOwners) {
      emailsToSend.push(
        sendEmail(
          () =>
            new CreditBalanceLowWarningEmail({
              user: admin,
              balance,
              team,
              creditFor,
            })
        )
      );
    }

    await Promise.all(emailsToSend);
  }

  if (user) {
    await sendEmail(() => new CreditBalanceLowWarningEmail({ user, balance, creditFor }));
  }
};

export const sendCreditBalanceLimitReachedEmails = async ({
  team,
  user,
  creditFor,
}: {
  team?: {
    name: string;
    id: number;
    adminAndOwners: {
      id: number;
      name: string | null;
      email: string;
      t: TFunction;
    }[];
  };
  user?: {
    id: number;
    name: string | null;
    email: string;
    t: TFunction;
  };
  creditFor?: CreditUsageType;
}) => {
  if ((!team || !team.adminAndOwners.length) && !user) return;

  if (team) {
    const emailsToSend: Promise<unknown>[] = [];

    for (const admin of team.adminAndOwners) {
      emailsToSend.push(
        sendEmail(() => new CreditBalanceLimitReachedEmail({ user: admin, team, creditFor }))
      );
    }
    await Promise.all(emailsToSend);
  }

  if (user) {
    await sendEmail(() => new CreditBalanceLimitReachedEmail({ user, creditFor }));
  }
};

export const sendProrationInvoiceEmails = async ({
  team,
  proration,
  invoiceUrl,
  isAutoCharge,
  adminAndOwners,
}: {
  team: {
    id: number;
    name: string | null;
  };
  proration: {
    monthKey: string;
    netSeatIncrease: number;
    proratedAmount: number;
  };
  invoiceUrl?: string | null;
  isAutoCharge: boolean;
  adminAndOwners: {
    id: number;
    name: string | null;
    email: string;
    t: TFunction;
  }[];
}) => {
  if (!adminAndOwners.length) return;

  const emailsToSend: Promise<unknown>[] = [];

  for (const admin of adminAndOwners) {
    emailsToSend.push(
      sendEmail(
        () =>
          new ProrationInvoiceEmail({
            user: admin,
            team,
            proration,
            invoiceUrl,
            isAutoCharge,
          })
      )
    );
  }

  const results = await Promise.allSettled(emailsToSend);
  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length > 0) {
    console.error(`${failures.length} email(s) failed to send`, failures);
  }
};

export const sendProrationReminderEmails = async ({
  team,
  proration,
  invoiceUrl,
  adminAndOwners,
}: {
  team: {
    id: number;
    name: string | null;
  };
  proration: {
    monthKey: string;
    netSeatIncrease: number;
    proratedAmount: number;
  };
  invoiceUrl?: string | null;
  adminAndOwners: {
    id: number;
    name: string | null;
    email: string;
    t: TFunction;
  }[];
}) => {
  if (!adminAndOwners.length) return;

  const emailsToSend: Promise<unknown>[] = [];

  for (const admin of adminAndOwners) {
    emailsToSend.push(
      sendEmail(
        () =>
          new ProrationReminderEmail({
            user: admin,
            team,
            proration,
            invoiceUrl,
          })
      )
    );
  }

  const results = await Promise.allSettled(emailsToSend);
  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length > 0) {
    console.error(`${failures.length} email(s) failed to send`, failures);
  }
};
