import { AppConfig } from "@/config/type";
import { AppsRepository } from "@/modules/apps/apps.repository";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { getReturnToValueFromQueryState } from "@/modules/stripe/utils/getReturnToValueFromQueryState";
import { stripeInstance } from "@/modules/stripe/utils/newStripeInstance";
import { StripeData } from "@/modules/stripe/utils/stripeDataSchemas";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Prisma } from "@prisma/client";
import Stripe from "stripe";
import { z } from "zod";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

import { stripeKeysResponseSchema } from "./utils/stripeDataSchemas";

import stringify = require("qs-stringify");

@Injectable()
export class StripeService {
  public stripe: Stripe;
  private redirectUri = `${this.config.get("api.url")}/stripe/save`;

  constructor(
    configService: ConfigService<AppConfig>,
    private readonly config: ConfigService,
    private readonly appsRepository: AppsRepository,
    private readonly credentialRepository: CredentialsRepository,
    private readonly tokensRepository: TokensRepository
  ) {
    this.stripe = new Stripe(configService.get("stripe.apiKey", { infer: true }) ?? "", {
      apiVersion: "2020-08-27",
    });
  }

  async getStripeRedirectUrl(state: string, userEmail?: string, userName?: string | null) {
    const { client_id } = await this.getStripeAppKeys();

    const stripeConnectParams: Stripe.OAuthAuthorizeUrlParams = {
      client_id,
      scope: "read_write",
      response_type: "code",
      stripe_user: {
        email: userEmail,
        first_name: userName || undefined,
        /** We need this so E2E don't fail for international users */
        country: process.env.NEXT_PUBLIC_IS_E2E ? "US" : undefined,
      },
      redirect_uri: this.redirectUri,
      state: state,
    };

    const params = z.record(z.any()).parse(stripeConnectParams);
    const query = stringify(params);
    const url = `https://connect.stripe.com/oauth/authorize?${query}`;

    return url;
  }

  async getStripeAppKeys() {
    const app = await this.appsRepository.getAppBySlug("stripe");

    const { client_id, client_secret } = stripeKeysResponseSchema.parse(app?.keys);

    if (!client_id) {
      throw new NotFoundException("Stripe app not found");
    }

    if (!client_secret) {
      throw new NotFoundException("Stripe app not found");
    }

    return { client_id, client_secret };
  }

  async saveStripeAccount(state: string, code: string, accessToken: string): Promise<{ url: string }> {
    const userId = await this.tokensRepository.getAccessTokenOwnerId(accessToken);

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

    await this.appsRepository.createAppCredential(
      "stripe_payment",
      data as unknown as Prisma.InputJsonObject,
      userId,
      "stripe"
    );

    return { url: getReturnToValueFromQueryState(state) };
  }

  async checkIfStripeAccountConnected(userId: number): Promise<{ status: typeof SUCCESS_STATUS }> {
    const stripeCredentials = await this.credentialRepository.getByTypeAndUserId("stripe_payment", userId);

    if (!stripeCredentials) {
      throw new NotFoundException("Credentials for stripe not found.");
    }

    if (stripeCredentials.invalid) {
      throw new BadRequestException("Invalid stripe credentials.");
    }

    const stripeKey = JSON.stringify(stripeCredentials.key);
    const stripeKeyObject = JSON.parse(stripeKey);

    const stripeAccount = await stripeInstance.accounts.retrieve(stripeKeyObject?.stripe_user_id);

    // both of these should be true for an account to be fully active
    if (!stripeAccount.payouts_enabled || !stripeAccount.charges_enabled) {
      throw new BadRequestException("Stripe account is not an active account");
    }

    return {
      status: SUCCESS_STATUS,
    };
  }
}
