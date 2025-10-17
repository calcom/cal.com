import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

import { OrganizationPaymentService } from "../OrganizationPaymentService";
import { OrganizationPermissionService } from "../OrganizationPermissionService";
import type { IOrganizationOnboardingService } from "./IOrganizationOnboardingService";
import type { TeamInput, InvitedMemberInput, CreateOnboardingIntentInput, OnboardingUser } from "./types";

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

  abstract createOnboardingIntent(input: CreateOnboardingIntentInput): Promise<any>;

  protected async createOnboardingRecord(input: CreateOnboardingIntentInput) {
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
      logo: input.logo ?? null,
      bio: input.bio ?? null,
      brandColor: input.brandColor ?? null,
      bannerUrl: input.bannerUrl ?? null,
    });

    log.debug("Organization onboarding created", safeStringify({ onboardingId: organizationOnboarding.id }));

    return organizationOnboarding;
  }

  protected filterTeamsAndInvites(teams: TeamInput[] = [], invitedMembers: InvitedMemberInput[] = []) {
    const teamsData = teams
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
}
