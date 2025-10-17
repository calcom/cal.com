import { OrganizationDowngradeFactory } from "@calcom/features/ee/organizations/lib/service/downgrade/OrganizationDowngradeFactory";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../trpc";
import type { TDowngradeOrganizationInputSchema } from "./downgradeOrganization.schema";

const log = logger.getSubLogger({ prefix: ["downgradeOrganization.handler"] });

type DowngradeOrganizationOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDowngradeOrganizationInputSchema;
};

export default async function downgradeOrganizationHandler({ ctx, input }: DowngradeOrganizationOptions) {
  const { organizationId, targetTeamIdForCredits } = input;

  log.info(
    "Starting organization downgrade (admin)",
    safeStringify({ userId: ctx.user.id, organizationId, targetTeamIdForCredits })
  );

  // Verify the team exists and is an organization
  const organization = await prisma.team.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      isOrganization: true,
    },
  });

  if (!organization) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Organization not found",
    });
  }

  if (!organization.isOrganization) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This team is not an organization",
    });
  }

  // Create downgrade service and execute downgrade
  const downgradeService = OrganizationDowngradeFactory.create();

  try {
    const result = await downgradeService.downgradeOrganization(
      organizationId,
      ctx.user.id,
      targetTeamIdForCredits
    );

    if (!result.success) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Downgrade failed: ${result.errors?.join(", ") || "Unknown error"}`,
      });
    }

    log.info(
      "Organization downgrade complete",
      safeStringify({
        organizationId,
        teamsExtracted: result.teams.length,
        membersRemoved: result.removedMembers.length,
      })
    );

    return result;
  } catch (error) {
    log.error(
      "Organization downgrade failed",
      safeStringify({
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      })
    );

    if (error instanceof TRPCError) {
      throw error;
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error instanceof Error ? error.message : "Failed to downgrade organization",
    });
  }
}
