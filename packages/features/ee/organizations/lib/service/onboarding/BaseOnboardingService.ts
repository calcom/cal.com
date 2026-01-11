import type { TFunction } from "i18next";

import { sendOrganizationCreationEmail } from "@calcom/emails/organization-email-service";
import { sendEmailVerification } from "@calcom/features/auth/lib/verifyEmail";
import { getOrganizationRepository } from "@calcom/features/ee/organizations/di/OrganizationRepository.container";
import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import {
  assertCanCreateOrg,
  findUserToBeOrgOwner,
  setupDomain,
} from "@calcom/features/ee/organizations/lib/server/orgCreationUtils";
import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { OrganizationOnboardingRepository } from "@calcom/features/organizations/repositories/OrganizationOnboardingRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";
import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { uploadLogo } from "@calcom/lib/server/avatar";
import { getTranslation } from "@calcom/lib/server/i18n";
import { isBase64Image, resizeBase64Image } from "@calcom/lib/server/resizeBase64Image";
import slugify from "@calcom/lib/slugify";
import { prisma } from "@calcom/prisma";
import type { Prisma, Team, User } from "@calcom/prisma/client";
import { CreationSource, MembershipRole, UserPermissionRole } from "@calcom/prisma/enums";
import { userMetadata, teamMetadataStrictSchema } from "@calcom/prisma/zod-utils";
import { createTeamsHandler } from "@calcom/trpc/server/routers/viewer/organizations/createTeams.handler";
import { inviteMembersWithNoInviterPermissionCheck } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/inviteMember.handler";

import { OrganizationPaymentService } from "../../OrganizationPaymentService";
import { OrganizationPermissionService } from "../../OrganizationPermissionService";
import type { IOrganizationOnboardingService } from "./IOrganizationOnboardingService";
import type {
  TeamInput,
  InvitedMemberInput,
  CreateOnboardingIntentInput,
  OnboardingUser,
  OrganizationData,
  TeamData,
  InvitedMember,
  OrganizationOnboardingData,
  OnboardingIntentResult,
} from "./types";

const log = logger.getSubLogger({ prefix: ["BaseOnboardingService"] });

export abstract class BaseOnboardingService implements IOrganizationOnboardingService {
  protected user: OnboardingUser;
  protected paymentService: OrganizationPaymentService;
  protected permissionService: OrganizationPermissionService;

  constructor(
    user: OnboardingUser,
    paymentService?: OrganizationPaymentService,
    permissionService?: OrganizationPermissionService
  ) {
    this.user = user;
    this.paymentService = paymentService || new OrganizationPaymentService(user);
    this.permissionService = permissionService || new OrganizationPermissionService(user);
  }

  abstract createOnboardingIntent(input: CreateOnboardingIntentInput): Promise<OnboardingIntentResult>;
  abstract createOrganization(
    organizationOnboarding: OrganizationOnboardingData,
    paymentDetails?: { subscriptionId: string; subscriptionItemId: string }
  ): Promise<{ organization: Team; owner: User }>;

  protected async createOnboardingRecord(input: CreateOnboardingIntentInput & { onboardingId?: string }) {
    const processedAssets = await this.processOnboardingBrandAssets({
      logo: input.logo,
      bannerUrl: input.bannerUrl,
    });

    if (input.onboardingId) {
      log.debug(
        "Updating existing organization onboarding record (resume flow)",
        safeStringify({
          onboardingId: input.onboardingId,
          slug: input.slug,
          name: input.name,
        })
      );

      const updateData: {
        logo?: string | null;
        bio?: string | null;
        brandColor?: string | null;
        bannerUrl?: string | null;
        teams?: TeamData[];
        invitedMembers?: InvitedMember[];
      } = {
        bio: input.bio ?? null,
        brandColor: input.brandColor ?? null,
        teams: input.teams ?? [],
        invitedMembers: input.invitedMembers ?? [],
      };

      if (processedAssets.logo !== undefined) {
        updateData.logo = processedAssets.logo;
      }
      if (processedAssets.bannerUrl !== undefined) {
        updateData.bannerUrl = processedAssets.bannerUrl;
      }

      await OrganizationOnboardingRepository.update(input.onboardingId, updateData);

      const updatedOnboarding = await OrganizationOnboardingRepository.findById(input.onboardingId);
      if (!updatedOnboarding) {
        throw new Error(`Onboarding record ${input.onboardingId} not found after update`);
      }

      log.debug("Organization onboarding updated", safeStringify({ onboardingId: updatedOnboarding.id }));
      return updatedOnboarding;
    }

    log.debug(
      "Creating organization onboarding record",
      safeStringify({
        slug: input.slug,
        name: input.name,
        orgOwnerEmail: input.orgOwnerEmail,
        isPlatform: input.isPlatform,
      })
    );

    const organizationOnboarding = await this.paymentService.createOrganizationOnboarding({
      name: input.name,
      slug: input.slug,
      orgOwnerEmail: input.orgOwnerEmail,
      seats: input.seats,
      pricePerSeat: input.pricePerSeat,
      billingPeriod: input.billingPeriod,
      createdByUserId: this.user.id,
      logo: processedAssets.logo ?? null,
      bio: input.bio ?? null,
      brandColor: input.brandColor ?? null,
      bannerUrl: processedAssets.bannerUrl ?? null,
      teams: input.teams ?? [],
      invitedMembers: input.invitedMembers ?? [],
    });

    log.debug("Organization onboarding created", safeStringify({ onboardingId: organizationOnboarding.id }));

    return organizationOnboarding;
  }

  private async ensureConflictingSlugTeamIsMigrated(
    orgSlug: string,
    teams: TeamInput[] = []
  ): Promise<TeamInput[]> {
    const teamRepository = new TeamRepository(prisma);
    const ownedTeams = await teamRepository.findOwnedTeamsByUserId({ userId: this.user.id });

    const conflictingTeam = ownedTeams.find((team) => team.slug === orgSlug);

    if (!conflictingTeam) {
      return teams;
    }

    const existingTeam = teams.find((t) => t.id === conflictingTeam.id);

    if (existingTeam) {
      if (existingTeam.isBeingMigrated) {
        return teams;
      }

      return teams.map((team) =>
        team.id === conflictingTeam.id ? { ...team, isBeingMigrated: true } : team
      );
    }

    return [
      ...teams,
      {
        id: conflictingTeam.id,
        name: conflictingTeam.name,
        isBeingMigrated: true,
        slug: conflictingTeam.slug,
      },
    ];
  }

  protected async buildTeamsAndInvites(
    orgSlug: string,
    teams: TeamInput[] = [],
    invitedMembers: InvitedMemberInput[] = []
  ) {
    const enrichedTeams = await this.ensureConflictingSlugTeamIsMigrated(orgSlug, teams);

    const teamsData = enrichedTeams
      .filter((team) => team.name.trim().length > 0)
      .map((team) => ({
        id: team.id === -1 ? -1 : team.id,
        name: team.name,
        isBeingMigrated: team.isBeingMigrated,
        slug: team.slug,
      }));

    const invitedMembersData = invitedMembers
      .filter((invite) => invite.email.trim().length > 0)
      .map((invite) => ({
        email: invite.email,
        name: invite.name,
        teamId: invite.teamId,
        teamName: invite.teamName,
        role: invite.role,
      }));

    return { teamsData, invitedMembersData };
  }

  protected handleAdminHandoverIfNeeded(
    input: CreateOnboardingIntentInput,
    onboardingId: string
  ): OnboardingIntentResult | null {
    const isAdminHandoverFlow =
      this.user.role === UserPermissionRole.ADMIN &&
      this.user.email !== input.orgOwnerEmail &&
      (!input.teams || input.teams.length === 0) &&
      (!input.invitedMembers || input.invitedMembers.length === 0);

    log.debug(
      "Checking admin handover flow",
      safeStringify({
        userRole: this.user.role,
        isAdmin: this.user.role === UserPermissionRole.ADMIN,
        userEmail: this.user.email,
        orgOwnerEmail: input.orgOwnerEmail,
        emailsDifferent: this.user.email !== input.orgOwnerEmail,
        teamsEmpty: !input.teams || input.teams.length === 0,
        membersEmpty: !input.invitedMembers || input.invitedMembers.length === 0,
        isAdminHandoverFlow,
      })
    );

    if (!isAdminHandoverFlow) {
      return null;
    }

    log.debug(
      "Admin handover flow detected",
      safeStringify({ adminEmail: this.user.email, orgOwnerEmail: input.orgOwnerEmail })
    );

    return {
      userId: this.user.id,
      orgOwnerEmail: input.orgOwnerEmail,
      name: input.name,
      slug: input.slug,
      seats: input.seats ?? null,
      pricePerSeat: input.pricePerSeat ?? null,
      billingPeriod: input.billingPeriod,
      isPlatform: input.isPlatform,
      organizationOnboardingId: onboardingId,
      checkoutUrl: null,
      organizationId: null,
      handoverUrl: `${WEBAPP_URL}/settings/organizations/new/resume?onboardingId=${onboardingId}`,
    };
  }

  protected isAdminCreatingForSelf(input: { orgOwnerEmail: string }): boolean {
    return this.user.role === UserPermissionRole.ADMIN && this.user.email === input.orgOwnerEmail;
  }

  private async processOnboardingBrandAssets(input: {
    logo?: string | null;
    bannerUrl?: string | null;
  }): Promise<{ logo?: string | null; bannerUrl?: string | null }> {
    const [logo, bannerUrl] = await Promise.all([
      input.logo ? resizeBase64Image(input.logo) : Promise.resolve(input.logo),
      input.bannerUrl
        ? resizeBase64Image(input.bannerUrl, { maxSize: 1500 })
        : Promise.resolve(input.bannerUrl),
    ]);

    return { logo, bannerUrl };
  }

  private async uploadImageAsset({
    image,
    teamId,
    isBanner = false,
  }: {
    image: string;
    teamId: number;
    isBanner?: boolean;
  }): Promise<string> {
    if (!isBase64Image(image)) {
      return image;
    }

    return await uploadLogo({
      logo: image,
      teamId,
      isBanner,
    });
  }

  protected async uploadOrganizationBrandAssets({
    logoUrl,
    bannerUrl,
    organizationId,
  }: {
    logoUrl?: string | null;
    bannerUrl?: string | null;
    organizationId: number;
  }): Promise<{
    logoUrl?: string | null;
    bannerUrl?: string | null;
  }> {
    const uploadedLogoUrl = logoUrl
      ? await this.uploadImageAsset({ image: logoUrl, teamId: organizationId })
      : logoUrl;

    const uploadedBannerUrl = bannerUrl
      ? await this.uploadImageAsset({ image: bannerUrl, teamId: organizationId, isBanner: true })
      : bannerUrl;

    if (uploadedLogoUrl === undefined && uploadedBannerUrl === undefined) {
      return {
        logoUrl,
        bannerUrl,
      };
    }

    return await prisma.team.update({
      where: { id: organizationId },
      data: {
        logoUrl: uploadedLogoUrl,
        bannerUrl: uploadedBannerUrl,
      },
      select: {
        logoUrl: true,
        bannerUrl: true,
      },
    });
  }

  protected async createOrganizationWithExistingUserAsOwner({
    owner,
    orgData,
  }: {
    owner: NonNullable<Awaited<ReturnType<typeof findUserToBeOrgOwner>>>;
    orgData: OrganizationData;
  }) {
    const organizationRepository = getOrganizationRepository();
    const orgOwnerTranslation = await getTranslation(owner.locale || "en", "common");
    let organization = orgData.id ? await organizationRepository.findById({ id: orgData.id }) : null;

    if (organization) {
      log.info(
        `Reusing existing organization:`,
        safeStringify({
          slug: orgData.slug,
          id: organization.id,
        })
      );
      return { organization };
    }

    const { slugConflictType } = await assertCanCreateOrg({
      slug: orgData.slug,
      isPlatform: orgData.isPlatform,
      orgOwner: owner,
      errorOnUserAlreadyPartOfOrg: false,
      restrictBasedOnMinimumPublishedTeams: false,
    });

    const canSetSlug = slugConflictType === "teamUserIsMemberOfExists" ? false : true;

    log.info(
      `Creating organization for owner ${owner.email} with slug ${orgData.slug} and canSetSlug=${canSetSlug}`
    );

    try {
      const nonOrgUsername = owner.username || "";

      // Create organization first to get the ID
      const orgCreationResult = await organizationRepository.createWithExistingUserAsOwner({
        orgData: {
          ...orgData,
          // Don't pass brand assets yet - will be uploaded after org is created
          logoUrl: null,
          bannerUrl: null,
          ...(canSetSlug ? { slug: orgData.slug } : { slug: null, requestedSlug: orgData.slug }),
        },
        owner: {
          id: owner.id,
          email: owner.email,
          nonOrgUsername,
        },
      });

      organization = {
        ...orgCreationResult.organization,
        ...(await this.uploadOrganizationBrandAssets({
          logoUrl: orgData.logoUrl,
          bannerUrl: orgData.bannerUrl,
          organizationId: orgCreationResult.organization.id,
        })),
      };

      const ownerProfile = orgCreationResult.ownerProfile;
      if (!orgData.isPlatform) {
        await sendOrganizationCreationEmail({
          language: orgOwnerTranslation,
          from: `${organization.name}'s admin`,
          to: owner.email,
          ownerNewUsername: ownerProfile.username,
          ownerOldUsername: nonOrgUsername,
          orgDomain: getOrgFullOrigin(orgData.slug, { protocol: false }),
          orgName: organization.name,
          prevLink: `${getOrgFullOrigin("", { protocol: true })}/${owner.username || ""}`,
          newLink: `${getOrgFullOrigin(orgData.slug, { protocol: true })}/${ownerProfile.username}`,
        });
      }

      const availability = getAvailabilityFromSchedule(DEFAULT_SCHEDULE);
      await prisma.availability.createMany({
        data: availability.map((schedule) => ({
          days: schedule.days,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          userId: owner.id,
        })),
      });
    } catch (error) {
      log.error(
        `RecoverableError: Error creating organization for owner ${owner.email}.`,
        safeStringify(error)
      );
      throw error;
    }

    return { organization };
  }

  protected async createOrganizationWithNonExistentUserAsOwner({
    email,
    orgData,
  }: {
    email: string;
    orgData: OrganizationData;
  }) {
    const organizationRepository = getOrganizationRepository();
    let organization = orgData.id
      ? await organizationRepository.findById({ id: orgData.id })
      : await organizationRepository.findBySlug({ slug: orgData.slug });

    if (organization) {
      log.info(
        `createOrganizationWithNonExistentUserAsOwner: Reusing existing organization:`,
        safeStringify({ slug: orgData.slug, id: organization.id })
      );
      const owner = await findUserToBeOrgOwner(email);
      if (!owner) {
        throw new Error(`Org exists but owner could not be found for email: ${email}`);
      }
      return { organization, owner };
    }

    const orgCreationResult = await organizationRepository.createWithNonExistentOwner({
      orgData: {
        ...orgData,
        // To be uploaded after org is created
        logoUrl: null,
        bannerUrl: null,
      },
      owner: {
        email: email,
      },
      creationSource: CreationSource.WEBAPP,
    });

    organization = {
      ...orgCreationResult.organization,
      ...(await this.uploadOrganizationBrandAssets({
        logoUrl: orgData.logoUrl,
        bannerUrl: orgData.bannerUrl,
        organizationId: orgCreationResult.organization.id,
      })),
    };

    const { ownerProfile, orgOwner: orgOwnerFromCreation } = orgCreationResult;
    const orgOwner = await findUserToBeOrgOwner(orgOwnerFromCreation.email);
    if (!orgOwner) {
      throw new Error(
        `Just created the owner ${orgOwnerFromCreation.email}, but couldn't find it in the database`
      );
    }

    const translation = await getTranslation(orgOwner.locale ?? "en", "common");

    await sendEmailVerification({
      email: orgOwner.email,
      language: orgOwner.locale ?? "en",
      username: ownerProfile.username || "",
      isPlatform: orgData.isPlatform,
    });

    if (!orgData.isPlatform) {
      await sendOrganizationCreationEmail({
        language: translation,
        from: orgOwner.name ?? `${organization.name}'s admin`,
        to: orgOwner.email,
        ownerNewUsername: ownerProfile.username,
        ownerOldUsername: null,
        orgDomain: getOrgFullOrigin(orgData.slug, { protocol: false }),
        orgName: organization.name,
        prevLink: null,
        newLink: `${getOrgFullOrigin(orgData.slug, { protocol: true })}/${ownerProfile.username}`,
      });
    }

    return {
      organization,
      owner: orgOwner,
    };
  }

  protected async createOrMoveTeamsToOrganization(teams: TeamData[], owner: User, organizationId: number) {
    if (teams.length === 0) return;

    const teamsToCreate = teams.filter((team) => !team.isBeingMigrated).map((team) => team.name);
    const teamsToMove = teams
      .filter((team) => team.isBeingMigrated)
      .map((team) => ({
        id: team.id,
        newSlug: team.slug ? slugify(team.slug) : team.slug,
        shouldMove: true,
      }));

    log.info(
      `Creating ${teamsToCreate} teams and moving ${teamsToMove.map(
        (team) => team.newSlug
      )} teams for organization ${organizationId}`
    );

    await createTeamsHandler({
      ctx: {
        user: {
          ...owner,
          organizationId,
        },
      },
      input: {
        teamNames: teamsToCreate,
        orgId: organizationId,
        moveTeams: teamsToMove,
        creationSource: CreationSource.WEBAPP,
      },
    });

    log.info(
      `Created ${teamsToCreate.length} teams and moved ${teamsToMove.length} teams for organization ${organizationId}`
    );
  }

  protected async inviteMembers(invitedMembers: InvitedMember[], organization: Team, teamsData: TeamData[]) {
    if (invitedMembers.length === 0) return;

    log.info(
      `Processing ${invitedMembers.length} member invites for organization ${organization.id}`,
      safeStringify({
        invitedMembers: invitedMembers.map((m) => ({
          email: m.email,
          teamId: m.teamId,
          teamName: m.teamName,
          role: m.role,
        })),
      })
    );

    const createdTeams = await prisma.team.findMany({
      where: {
        parentId: organization.id,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    log.info(
      `Found ${createdTeams.length} teams in organization`,
      safeStringify({
        teams: createdTeams.map((t) => ({ id: t.id, name: t.name })),
      })
    );

    const teamNameToId = new Map<string, number>();
    createdTeams.forEach((team) => {
      teamNameToId.set(team.name.toLowerCase(), team.id);
    });

    const teamIdMap = new Map<number, number>();
    teamsData.forEach((teamData) => {
      if (teamData.isBeingMigrated) {
        teamIdMap.set(teamData.id, teamData.id);
      } else {
        const createdTeam = createdTeams.find((t) => t.name === teamData.name);
        if (createdTeam) {
          teamIdMap.set(teamData.id, createdTeam.id);
        }
      }
    });

    const invitesToOrg: InvitedMember[] = [];
    const invitesToTeams = new Map<number, InvitedMember[]>();

    for (const member of invitedMembers) {
      let targetTeamId: number | undefined;

      if (member.teamId !== undefined) {
        targetTeamId = teamIdMap.get(member.teamId) || member.teamId;
        log.debug(`Member ${member.email}: teamId ${member.teamId} -> resolved to ${targetTeamId}`);
      } else if (member.teamName) {
        targetTeamId = teamNameToId.get(member.teamName.toLowerCase());
        log.debug(
          `Member ${member.email}: teamName "${member.teamName}" -> resolved to ${
            targetTeamId || "not found"
          }`
        );
      }

      if (targetTeamId && createdTeams.some((t) => t.id === targetTeamId)) {
        if (!invitesToTeams.has(targetTeamId)) {
          invitesToTeams.set(targetTeamId, []);
        }
        invitesToTeams.get(targetTeamId)!.push(member);
        log.debug(`Member ${member.email} will be invited to team ${targetTeamId}`);
      } else {
        invitesToOrg.push(member);
        log.debug(
          `Member ${member.email} will be invited to organization (no team specified or team not found)`
        );
      }
    }

    log.info(
      "Invite categorization complete",
      safeStringify({
        orgInvites: invitesToOrg.length,
        teamInvites: invitesToTeams.size,
        teamBreakdown: Array.from(invitesToTeams.entries()).map(([teamId, members]) => ({
          teamId,
          count: members.length,
          emails: members.map((m) => m.email),
        })),
      })
    );

    if (invitesToOrg.length > 0) {
      log.info(`Inviting ${invitesToOrg.length} members to organization ${organization.id}`);
      await inviteMembersWithNoInviterPermissionCheck({
        inviterName: null,
        teamId: organization.id,
        language: "en",
        creationSource: CreationSource.WEBAPP,
        orgSlug: organization.slug || null,
        invitations: invitesToOrg.map((member) => ({
          usernameOrEmail: member.email,
          role: (member.role as MembershipRole) || MembershipRole.MEMBER,
        })),
        isDirectUserAction: false,
      });
    }

    for (const [teamId, members] of Array.from(invitesToTeams.entries())) {
      const teamName = createdTeams.find((t) => t.id === teamId)?.name || `team ${teamId}`;
      log.info(`Inviting ${members.length} members to team "${teamName}" (${teamId})`);
      await inviteMembersWithNoInviterPermissionCheck({
        inviterName: null,
        teamId: teamId,
        language: "en",
        creationSource: CreationSource.WEBAPP,
        orgSlug: organization.slug || null,
        invitations: members.map((member: InvitedMember) => ({
          usernameOrEmail: member.email,
          role: (member.role as MembershipRole) || MembershipRole.MEMBER,
        })),
        isDirectUserAction: false,
      });
    }

    log.info("All member invites processed successfully");
  }

  protected async ensureStripeCustomerIdIsUpdated({
    owner,
    stripeCustomerId,
  }: {
    owner: User;
    stripeCustomerId: string;
  }) {
    const parsedMetadata = userMetadata.parse(owner.metadata);

    await new UserRepository(prisma).updateStripeCustomerId({
      id: owner.id,
      stripeCustomerId: stripeCustomerId,
      existingMetadata: parsedMetadata,
    });
  }

  protected async backwardCompatibilityForSubscriptionDetails({
    organization,
    paymentSubscriptionId,
    paymentSubscriptionItemId,
  }: {
    organization: {
      id: number;
      metadata: Prisma.JsonValue;
    };
    paymentSubscriptionId?: string;
    paymentSubscriptionItemId?: string;
  }) {
    if (!paymentSubscriptionId || !paymentSubscriptionItemId) {
      return organization;
    }

    const existingMetadata = teamMetadataStrictSchema.parse(organization.metadata);
    const organizationRepository = getOrganizationRepository();
    const updatedOrganization = await organizationRepository.updateStripeSubscriptionDetails({
      id: organization.id,
      stripeSubscriptionId: paymentSubscriptionId,
      stripeSubscriptionItemId: paymentSubscriptionItemId,
      existingMetadata,
    });
    return updatedOrganization;
  }

  protected async hasConflictingOrganization({ slug, onboardingId }: { slug: string; onboardingId: string }) {
    const organizationRepository = getOrganizationRepository();
    const organization = await organizationRepository.findBySlugIncludeOnboarding({ slug });
    if (!organization?.organizationOnboarding) {
      return false;
    }

    return organization.organizationOnboarding.id !== onboardingId;
  }

  protected async handleDomainSetup({
    organizationOnboarding,
    orgOwnerTranslation,
  }: {
    organizationOnboarding: OrganizationOnboardingData;
    orgOwnerTranslation: TFunction;
  }) {
    if (!organizationOnboarding.isDomainConfigured) {
      await setupDomain({
        slug: organizationOnboarding.slug,
        isPlatform: organizationOnboarding.isPlatform,
        orgOwnerEmail: organizationOnboarding.orgOwnerEmail,
        orgOwnerTranslation,
      });
    }

    await OrganizationOnboardingRepository.update(organizationOnboarding.id, {
      isDomainConfigured: true,
    });
  }
}
