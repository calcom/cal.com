import { OrganizationDowngradeFactory } from "@calcom/features/ee/organizations/lib/service/downgrade/OrganizationDowngradeFactory";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../trpc";
import type { TValidateDowngradeInputSchema } from "./validateDowngrade.schema";

const log = logger.getSubLogger({ prefix: ["validateDowngrade.handler"] });

type ValidateDowngradeOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TValidateDowngradeInputSchema;
};

export default async function validateDowngradeHandler({ ctx, input }: ValidateDowngradeOptions) {
  const { organizationId } = input;

  log.info("Validating organization downgrade (admin)", safeStringify({ userId: ctx.user.id, organizationId }));

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

  // Create downgrade service and validate
  const downgradeService = OrganizationDowngradeFactory.create();
  const validationResult = await downgradeService.validateDowngrade(organizationId);

  log.info(
    "Organization downgrade validation complete",
    safeStringify({
      organizationId,
      canDowngrade: validationResult.canDowngrade,
      blockersCount: validationResult.blockers.length,
      warningsCount: validationResult.warnings.length,
    })
  );

  return validationResult;
}
