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

const headers = ["Date", "Credits", "Type", "Booking UID", "Number of Segments"];

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

  const rows = creditBalance.expenseLogs.map((log) => [
    log.date.toISOString(),
    log.credits?.toString() ?? "",
    log.creditType,
    log.bookingUid ?? "",
    log.smsSegments?.toString() ?? "-",
  ]);

  const csvData = [headers, ...rows].map((row) => row.join(",")).join("\n");

  return { csvData };
};
