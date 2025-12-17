import { CreditService } from "@calcom/features/ee/billing/credit-service";
import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { TeamCreationService } from "@calcom/features/ee/teams/services/TeamCreationService";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TCreateTeamsSchema } from "./createTeams.schema";

const log = logger.getSubLogger({ prefix: ["viewer/organizations/createTeams.handler"] });
type CreateTeamsOptions = {
  ctx: {
    user: {
      id: number;
      organizationId: number | null;
    };
  };
  input: TCreateTeamsSchema;
};

export const createTeamsHandler = async ({ ctx, input }: CreateTeamsOptions) => {
  const organizationOwner = ctx.user;
  const { orgId, moveTeams, creationSource } = input;

  if (orgId !== organizationOwner.organizationId) {
    log.error("User is not the owner of the organization", safeStringify({ orgId, organizationOwner }));
    throw new NotAuthorizedError();
  }

  const permissionCheckService = new PermissionCheckService();
  const hasPermission = await permissionCheckService.checkPermission({
    userId: organizationOwner.id,
    teamId: orgId,
    permission: "team.create",
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });

  if (!hasPermission) {
    log.error(
      "User is not authorized to create teams in the organization",
      safeStringify({ orgId, organizationOwner })
    );
    throw new NotAuthorizedError();
  }

  const teamRepository = new TeamRepository(prisma);
  const creditService = new CreditService();
  const userRepository = new UserRepository(prisma);
  const teamCreationService = new TeamCreationService(
    teamRepository,
    creditService,
    permissionCheckService,
    userRepository
  );

  try {
    return await teamCreationService.createTeamsForOrganization({
      orgId,
      teamNames: input.teamNames,
      moveTeams,
      creationSource,
      ownerId: organizationOwner.id,
    });
  } catch (error) {
    if (error instanceof ErrorWithCode) {
      // Only handle errors that TeamCreationService can throw
      const trpcCode = getTRPCErrorCodeFromTeamCreationError(error.code);
      throw new TRPCError({
        code: trpcCode,
        message: error.message,
        cause: error,
      });
    }
    throw error;
  }
};

function getTRPCErrorCodeFromTeamCreationError(errorCode: ErrorCode): TRPCError["code"] {
  switch (errorCode) {
    case ErrorCode.NoOrganizationFound:
    case ErrorCode.InvalidOrganizationMetadata:
    case ErrorCode.NoOrganizationSlug:
    case ErrorCode.TeamSlugMissing:
      return "BAD_REQUEST";
    default:
      return "INTERNAL_SERVER_ERROR";
  }
}

class NotAuthorizedError extends TRPCError {
  constructor() {
    super({ code: "FORBIDDEN", message: "not_authorized" });
  }
}

export default createTeamsHandler;
