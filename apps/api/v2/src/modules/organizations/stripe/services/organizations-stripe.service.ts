import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { OrganizationsConferencingService } from "@/modules/organizations/conferencing/services/organizations-conferencing.service";
import { StripeService } from "@/modules/stripe/stripe.service";
import { UsersRepository } from "@/modules/users/users.repository";
import { BadRequestException, Logger } from "@nestjs/common";
import { Injectable } from "@nestjs/common";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

export type OAuthCallbackState = {
  accessToken: string;
  teamId?: string;
  orgId?: string;
  fromApp?: boolean;
  returnTo?: string;
  onErrorReturnTo?: string;
};

@Injectable()
export class OrganizationsStripeService {
  private logger = new Logger("OrganizationsStripeService");

  constructor(
    private readonly stripeService: StripeService,
    private readonly conferencingService: OrganizationsConferencingService,
    private readonly usersRepository: UsersRepository,
    private readonly credentialRepository: CredentialsRepository
  ) {}

  async getStripeTeamRedirectUrl({
    state,
    userEmail,
    userName,
  }: {
    state: OAuthCallbackState;
    userEmail?: string;
    userName?: string | null;
  }): Promise<string> {
    return await this.stripeService.getStripeRedirectUrl(state, userEmail, userName);
  }

  async saveStripeAccount({
    state,
    code,
    userId,
  }: {
    state: OAuthCallbackState;
    code: string;
    userId: number;
  }): Promise<{ url: string }> {
    const { orgId, teamId } = state;

    const user = await this.usersRepository.findByIdWithProfile(userId);

    if (!orgId) {
      throw new BadRequestException("orgId required");
    }

    if (!user) {
      throw new BadRequestException("user not found");
    }

    const isTeamLevel = !!teamId;
    const requiredRole = isTeamLevel ? "TEAM_ADMIN" : "ORG_ADMIN";

    const { teamId: validatedTeamId } = await this.conferencingService.verifyAccess({
      user,
      orgId,
      teamId,
      requiredRole,
      minimumPlan: "ESSENTIALS",
    });

    return await this.stripeService.saveStripeAccount(state, code, userId, validatedTeamId);
  }

  async checkIfTeamStripeAccountConnected(teamId: number): Promise<{ status: typeof SUCCESS_STATUS }> {
    const stripeCredentials = await this.credentialRepository.findCredentialByTypeAndTeamId(
      "stripe_payment",
      teamId
    );

    return await this.stripeService.validateStripeCredentials(stripeCredentials);
  }
}
