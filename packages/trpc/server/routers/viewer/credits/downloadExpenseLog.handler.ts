import { z } from "zod";

import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

const downloadExpenseLogSchema = z.object({
  teamId: z.number().optional(),
  startDate: z.string(),
  endDate: z.string(),
});

type DownloadExpenseLogOptions = {
  ctx: {
    user: { id: number };
  };
  input: z.infer<typeof downloadExpenseLogSchema>;
};

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

  const creditBalance = await prisma.creditBalance.findUnique({
    where: {
      teamId: teamId ?? undefined,
      userId: !teamId ? ctx.user.id : undefined,
    },
    include: {
      expenseLogs: {
        where: {
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        orderBy: {
          date: "desc",
        },
        select: {
          date: true,
          credits: true,
          creditType: true,
          bookingUid: true,
          smsSid: true,
          smsSegments: true,
        },
      },
    },
  });
  const headers = ["Date", "Credits", "Type", "Booking UID", "Number of Segments"];

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
