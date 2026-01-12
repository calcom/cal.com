import { CreditService } from "@calcom/features/ee/billing/credit-service";
import stripe from "@calcom/features/ee/payments/server/stripe";
import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import slugify from "@calcom/lib/slugify";
import type { Prisma } from "@calcom/prisma/client";
import type { CreationSource } from "@calcom/prisma/enums";
import { MembershipRole } from "@calcom/prisma/enums";
import { teamMetadataSchema, teamMetadataStrictSchema } from "@calcom/prisma/zod-utils";
import { inviteMembersWithNoInviterPermissionCheck } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/inviteMember.handler";

const log = logger.getSubLogger({ prefix: ["TeamCreationService"] });

export type CreateTeamsInput = {
  orgId: number;
  teamNames: string[];
  moveTeams: Array<{
    id: number;
    newSlug: string | null;
    shouldMove: boolean;
  }>;
  creationSource: CreationSource;
  ownerId: number;
};

export type CreateTeamsResult = {
  duplicatedSlugs: string[];
};

export type MoveTeamInput = {
  teamId: number;
  newSlug?: string | null;
  org: {
    id: number;
    slug: string | null;
    ownerId: number;
    metadata: Prisma.JsonValue;
  };
  creationSource: CreationSource;
};

export class TeamCreationService {
  constructor(
    private teamRepository: TeamRepository,
    private creditService: CreditService,
    private permissionCheckService: PermissionCheckService,
    private userRepository: UserRepository
  ) {}

  async createTeamsForOrganization(input: CreateTeamsInput): Promise<CreateTeamsResult> {
    const { orgId, teamNames, moveTeams, creationSource, ownerId } = input;

    const filteredTeamNames = teamNames.filter((name) => name.trim().length > 0);
    const organization = await this.validateOrganization(orgId);
    const duplicatedSlugs = await this.validateTeamSlugs({
      orgId,
      teamNames: filteredTeamNames,
    });

    for (const team of moveTeams.filter((team) => team.shouldMove)) {
      await this.moveTeamToOrganization({
        teamId: team.id,
        newSlug: team.newSlug,
        org: {
          ...organization,
          ownerId,
        },
        creationSource,
      });
    }

    if (duplicatedSlugs.length === filteredTeamNames.length) {
      return { duplicatedSlugs };
    }

    await this.createNewTeams({
      orgId,
      teamNames: filteredTeamNames,
      duplicatedSlugs,
      ownerId,
    });

    return { duplicatedSlugs };
  }

  async moveTeamToOrganization(input: MoveTeamInput): Promise<void> {
    const { teamId, newSlug, org, creationSource } = input;

    const team = await this.teamRepository.findTeamForMigration({ teamId });

    if (!team) {
      log.warn(`Team with id: ${teamId} not found. Skipping migration.`, {
        teamId,
        orgId: org.id,
        orgSlug: org.slug,
      });
      return;
    }

    if (team.parent?.isPlatform) {
      log.info(
        "Team belongs to a platform organization. Not moving to regular organization.",
        safeStringify({ teamId, newSlug, org, oldSlug: team.slug, platformOrgId: team.parent.id })
      );
      return;
    }

    log.info("Moving team", safeStringify({ teamId, newSlug, oldSlug: team.slug }));

    const finalSlug = newSlug ?? team.slug;
    const orgMetadataParseResult = teamMetadataSchema.safeParse(org.metadata);

    if (!orgMetadataParseResult.success) {
      log.error(
        "Invalid organization metadata when moving team",
        safeStringify({ teamId, orgId: org.id, parseError: orgMetadataParseResult.error })
      );
      throw new ErrorWithCode(ErrorCode.InvalidOrganizationMetadata, "invalid_organization_metadata");
    }

    const orgMetadata = orgMetadataParseResult.data;

    try {
      await this.teamRepository.updateTeamSlugAndParent({
        teamId,
        slug: finalSlug,
        parentId: org.id,
      });

      await this.creditService.moveCreditsFromTeamToOrg({ teamId, orgId: org.id });
    } catch (error) {
      log.error(
        "Error while moving team to organization",
        safeStringify(error),
        safeStringify({
          teamId,
          newSlug: finalSlug,
          orgId: org.id,
        })
      );
      throw error;
    }

    await this.inviteTeamMembersToOrganization({
      teamMembers: team.members,
      orgOwnerId: org.ownerId,
      orgSlug: org.slug,
      orgId: org.id,
      creationSource,
    });

    await this.createTeamRedirect({
      oldTeamSlug: team.slug,
      teamSlug: finalSlug,
      orgSlug: org.slug || (orgMetadata?.requestedSlug ?? null),
    });

    const subscriptionId = this.getSubscriptionId(team.metadata);
    if (subscriptionId) {
      await this.cancelTeamSubscription(subscriptionId);
    }
  }

  private async validateOrganization(orgId: number) {
    const organization = await this.teamRepository.findOrganizationForValidation(orgId);

    if (!organization) {
      throw new ErrorWithCode(ErrorCode.NoOrganizationFound, "no_organization_found");
    }

    const parseTeams = teamMetadataSchema.safeParse(organization?.metadata);

    if (!parseTeams.success) {
      throw new ErrorWithCode(ErrorCode.InvalidOrganizationMetadata, "invalid_organization_metadata");
    }

    // After the check above, parseTeams.success is guaranteed to be true
    const metadata = parseTeams.data;

    if (!metadata?.requestedSlug && !organization?.slug) {
      throw new ErrorWithCode(ErrorCode.NoOrganizationSlug, "no_organization_slug");
    }

    return organization;
  }

  async validateSingleTeamSlug({
    slug,
    parentId,
    organizationId,
  }: {
    slug: string;
    parentId: number | null;
    organizationId?: number | null;
  }): Promise<{ isTeamSlugTaken: boolean; isUserSlugTaken: boolean }> {
    const teamSlugCollision = await this.teamRepository.findTeamBySlugAndParentId({
      slug,
      parentId,
    });

    let isUserSlugTaken = false;
    if (organizationId) {
      const users = await this.userRepository.findManyByOrganization({ organizationId });
      isUserSlugTaken = users.some((user) => user.username === slug);
    }

    return {
      isTeamSlugTaken: !!teamSlugCollision,
      isUserSlugTaken,
    };
  }

  async createSingleTeam({
    slug,
    name,
    bio,
    parentId,
    ownerId,
  }: {
    slug: string;
    name: string;
    bio?: string | null;
    parentId?: number | null;
    ownerId: number;
  }) {
    return await this.teamRepository.createTeamWithOwner({
      slug,
      name,
      bio,
      parentId,
      ownerId,
    });
  }

  private async validateTeamSlugs({
    orgId,
    teamNames,
  }: {
    orgId: number;
    teamNames: string[];
  }): Promise<string[]> {
    const [teamSlugs, userSlugs] = await Promise.all([
      this.teamRepository.findTeamsByParentId(orgId),
      this.userRepository.findManyByOrganization({ organizationId: orgId }),
    ]);

    const existingSlugs = teamSlugs
      .flatMap((ts) => ts.slug ?? [])
      .concat(userSlugs.flatMap((us) => us.username ?? []));

    const duplicatedSlugs = existingSlugs.filter((slug) =>
      teamNames.map((item) => slugify(item)).includes(slug)
    );

    return duplicatedSlugs;
  }

  private async createNewTeams({
    orgId,
    teamNames,
    duplicatedSlugs,
    ownerId,
  }: {
    orgId: number;
    teamNames: string[];
    duplicatedSlugs: string[];
    ownerId: number;
  }): Promise<void> {
    const teamsToCreate = teamNames
      .map((name) => {
        const slug = slugify(name);
        if (!duplicatedSlugs.includes(slug)) {
          return {
            slug,
            name,
            parentId: orgId,
            ownerId,
          };
        }
        return null;
      })
      .filter(
        (team): team is { slug: string; name: string; parentId: number; ownerId: number } => team !== null
      );

    if (teamsToCreate.length > 0) {
      await this.teamRepository.createTeamsInTransaction(teamsToCreate);
    }
  }

  private async inviteTeamMembersToOrganization({
    teamMembers,
    orgOwnerId,
    orgSlug,
    orgId,
    creationSource,
  }: {
    teamMembers: Array<{
      role: MembershipRole;
      userId: number;
      user: {
        email: string;
      };
    }>;
    orgOwnerId: number;
    orgSlug: string | null;
    orgId: number;
    creationSource: CreationSource;
  }): Promise<void> {
    const invitableMembers = teamMembers
      .filter((membership) => membership.userId !== orgOwnerId)
      .map((membership) => ({
        usernameOrEmail: membership.user.email,
        role: membership.role,
      }));

    if (invitableMembers.length) {
      await inviteMembersWithNoInviterPermissionCheck({
        orgSlug,
        invitations: invitableMembers,
        creationSource,
        language: "en",
        inviterName: null,
        teamId: orgId,
        isDirectUserAction: false,
      });
    }
  }

  private async createTeamRedirect({
    oldTeamSlug,
    teamSlug,
    orgSlug,
  }: {
    oldTeamSlug: string | null;
    teamSlug: string | null;
    orgSlug: string | null;
  }): Promise<void> {
    logger.info(`Adding redirect for team: ${oldTeamSlug} -> ${teamSlug}`);
    if (!oldTeamSlug) {
      logger.warn(`No oldSlug for team. Not adding the redirect`);
      return;
    }
    if (!teamSlug) {
      throw new ErrorWithCode(ErrorCode.TeamSlugMissing, "No slug for team. Not adding the redirect");
    }
    if (!orgSlug) {
      logger.warn(`No slug for org. Not adding the redirect`);
      return;
    }

    await this.teamRepository.upsertTeamRedirect({
      oldTeamSlug,
      teamSlug,
      orgSlug,
    });
  }

  private async cancelTeamSubscription(subscriptionId: string): Promise<void> {
    try {
      log.debug("Canceling stripe subscription", safeStringify({ subscriptionId }));
      await stripe.subscriptions.cancel(subscriptionId);
    } catch (error) {
      // We intentionally don't re-throw here because canceling the subscription is a cleanup operation.
      // If it fails, we don't want to fail the entire team migration. The team has already been moved
      // and credits transferred, so subscription cancellation failure shouldn't block the migration.
      log.error("Error while cancelling stripe subscription", safeStringify(error));
    }
  }

  private getSubscriptionId(metadata: unknown): string | undefined {
    const parsedMetadata = teamMetadataStrictSchema.safeParse(metadata);
    if (!parsedMetadata.success) {
      log.warn(
        "Error parsing team metadata for subscription ID",
        safeStringify({ parseError: parsedMetadata.error })
      );
      return undefined;
    }

    const subscriptionId = parsedMetadata.data?.subscriptionId;
    if (!subscriptionId || subscriptionId === null) {
      log.warn("No subscriptionId found in team metadata", safeStringify({ metadata }));
      return undefined;
    }

    return subscriptionId;
  }
}
