import type { TFunction } from "i18next";

import type BaseEmail from "@calcom/emails/templates/_base-email";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import type { CreditUsageType } from "@calcom/prisma/enums";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";

import OrganizerPaymentRefundFailedEmail from "./templates/organizer-payment-refund-failed-email";
import NoShowFeeChargedEmail from "./templates/no-show-fee-charged-email";
import CreditBalanceLowWarningEmail from "./templates/credit-balance-low-warning-email";
import CreditBalanceLimitReachedEmail from "./templates/credit-balance-limit-reached-email";

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
        sendEmail(() => new CreditBalanceLowWarningEmail({ user: admin, balance, team, creditFor }))
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
