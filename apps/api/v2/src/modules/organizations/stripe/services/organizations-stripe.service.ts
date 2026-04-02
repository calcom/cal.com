import { ApiResponseWithoutData } from "@calcom/platform-types";
import type { Prisma } from "@calcom/prisma/client";
import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { AppsRepository } from "@/modules/apps/apps.repository";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { OAuthCallbackState, StripeService } from "@/modules/stripe/stripe.service";
import { stripeInstance } from "@/modules/stripe/utils/newStripeInstance";
import { StripeData } from "@/modules/stripe/utils/stripeDataSchemas";

@Injectable()
export class OrganizationsStripeService {
  private logger = new Logger("OrganizationsStripeService");

  constructor(
    private readonly stripeService: StripeService,
    private readonly credentialRepository: CredentialsRepository,
    private readonly appsRepository: AppsRepository
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

  async saveStripeAccount(
    state: OAuthCallbackState,
    code: string,
    teamId: number,
    userId?: number
  ): Promise<{ url: string }> {
    if (!userId) {
      throw new UnauthorizedException("Invalid Access token.");
    }

    const response = await stripeInstance.oauth.token({
      grant_type: "authorization_code",
      code: code?.toString(),
    });

    const data: StripeData = { ...response, default_currency: "" };
    if (response["stripe_user_id"]) {
      const account = await stripeInstance.accounts.retrieve(response["stripe_user_id"]);
      data["default_currency"] = account.default_currency;
    }

    const existingCredentials = await this.credentialRepository.findAllCredentialsByTypeAndTeamId(
      "stripe_payment",
      teamId
    );

    const credentialIdsToDelete = existingCredentials.map((item) => item.id);
    if (credentialIdsToDelete.length > 0) {
      await this.appsRepository.deleteTeamAppCredentials(credentialIdsToDelete, teamId);
    }

    await this.appsRepository.createTeamAppCredential(
      "stripe_payment",
      data as unknown as Prisma.InputJsonObject,
      teamId,
      "stripe"
    );

    return { url: state.returnTo ?? "" };
  }

  async checkIfTeamStripeAccountConnected(teamId: number): Promise<ApiResponseWithoutData> {
    const stripeCredentials = await this.credentialRepository.findCredentialByTypeAndTeamId(
      "stripe_payment",
      teamId
    );

    return await this.stripeService.validateStripeCredentials(stripeCredentials);
  }
}
