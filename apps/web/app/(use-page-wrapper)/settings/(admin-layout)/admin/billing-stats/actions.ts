"use server";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { MonthlyProrationService } from "@calcom/features/ee/billing/service/proration/MonthlyProrationService";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";

async function checkAdmin() {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (session?.user.role !== UserPermissionRole.ADMIN) {
    throw new Error("Unauthorized: Admin access required");
  }
  return session;
}

export async function triggerProrationForTeam(teamId: number, monthKey: string) {
  await checkAdmin();

  const prorationService = new MonthlyProrationService();

  try {
    const proration = await prorationService.createProrationForTeam({
      teamId,
      monthKey,
    });

    revalidatePath("/settings/admin/billing-stats");

    if (!proration) {
      return {
        success: false,
        message: "No proration created (net change may be 0)",
      };
    }

    return {
      success: true,
      message: `Proration created for team ${teamId}`,
      data: {
        prorationId: proration.id,
        netSeatIncrease: proration.netSeatIncrease,
        proratedAmount: proration.proratedAmount,
        status: proration.status,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function processAllProrations(monthKey: string) {
  await checkAdmin();

  const prorationService = new MonthlyProrationService();

  try {
    const results = await prorationService.processMonthlyProrations(monthKey);

    revalidatePath("/settings/admin/billing-stats");

    return {
      success: true,
      message: `Processed ${results.length} teams`,
      data: {
        processed: results.length,
        results,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
