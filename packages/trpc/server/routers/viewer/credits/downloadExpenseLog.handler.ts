import { CreditsRepository } from "@calcom/lib/server/repository/credits";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";

import { TRPCError } from "@trpc/server";

import type { TDownloadExpenseLogSchema } from "./downloadExpenseLog.schema";

type DownloadExpenseLogOptions = {
  ctx: {
    user: { id: number };
  };
  input: TDownloadExpenseLogSchema;
};

const headers = [
  "Date",
  "Credits",
  "Type",
  "Booking UID",
  "Number of Segments",
  "Call Duration",
  "External Ref",
  "Phone Number",
  "Email",
];

export const downloadExpenseLogHandler = async ({ ctx, input }: DownloadExpenseLogOptions) => {
  const { teamId, startDate, endDate } = input;

  if (teamId) {
    const adminMembership = await MembershipRepository.getAdminOrOwnerMembership(ctx.user.id, teamId);

    if (!adminMembership) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
      });
    }
  }

  const creditBalance = await CreditsRepository.findCreditBalanceWithExpenseLogs({
    teamId,
    userId: ctx.user.id,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  });

  if (!creditBalance) {
    return { csvData: headers.join(",") };
  }

  const rows = Array.isArray(creditBalance.expenseLogs)
    ? creditBalance.expenseLogs.map(
        (log: {
          date: Date;
          credits: number | null;
          creditType?: string;
          bookingUid?: string;
          smsSid?: string;
          smsSegments?: number;
          phoneNumber?: string;
          email?: string;
          callDuration?: number;
          externalRef?: string;
        }) => [
          log.date,
          log.credits,
          log.creditType,
          log.bookingUid,
          log.smsSid,
          log.smsSegments,
          log.phoneNumber,
          log.email,
          log.callDuration,
          log.externalRef,
        ]
      )
    : [];

  const csvData = [headers, ...rows].map((row) => row.join(",")).join("\n");

  return { csvData };
};
