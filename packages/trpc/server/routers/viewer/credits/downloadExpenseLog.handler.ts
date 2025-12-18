import { CreditsRepository } from "@calcom/features/credits/repositories/CreditsRepository";
import { TeamService } from "@calcom/features/ee/teams/services/teamService";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { MembershipRole } from "@calcom/prisma/enums";

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
    const team = await TeamService.fetchTeamOrThrow(teamId);

    const permissionService = new PermissionCheckService();
    const hasManageBillingPermission = await permissionService.checkPermission({
      userId: ctx.user.id,
      teamId,
      permission: team.isOrganization ? "organization.manageBilling" : "team.manageBilling",
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    });

    if (!hasManageBillingPermission) {
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
    log.phoneNumber ?? "",
    log.email ?? "",
    log.callDuration?.toString() ?? "-",
    log.externalRef ?? "-",
  ]);

  const csvData = [headers, ...rows].map((row) => row.join(",")).join("\n");

  return { csvData };
};
