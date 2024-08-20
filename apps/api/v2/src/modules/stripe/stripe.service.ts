import { AppConfig } from "@/config/type";
import { AppsRepository } from "@/modules/apps/apps.repository";
import { getReturnToValueFromQueryState } from "@/modules/stripe/utils/getReturnToValueFromQueryState";
import { stripeInstance } from "@/modules/stripe/utils/newStripeInstance";
import { StripeData } from "@/modules/stripe/utils/stripeDataSchemas";
import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Prisma } from "@prisma/client";
import stringify from "qs-stringify";
import Stripe from "stripe";
import { z } from "zod";

@Injectable()
export class StripeService {
  public stripe: Stripe;
  private stripeKeysResponseSchema = z.object({
    client_id: z.string().startsWith("ca_").min(1),
    client_secret: z.string().startsWith("sk_").min(1),
    public_key: z.string().startsWith("pk_").min(1),
    webhook_secret: z.string().startsWith("whsec_").min(1),
  });
  private redirectUri = `${this.config.get("api.url")}/stripe/save`;

  constructor(
    configService: ConfigService<AppConfig>,
    private readonly config: ConfigService,
    private readonly appsRepository: AppsRepository
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

    const { client_id, client_secret } = this.stripeKeysResponseSchema.parse(app?.keys);

    if (!client_id) {
      throw new NotFoundException();
    }

    if (!client_secret) {
      throw new NotFoundException();
    }

    return { client_id, client_secret };
  }

  async saveStripeAccount(
    state: string | string[] | undefined,
    code: string | string[] | undefined,
    userId: number
  ): Promise<{ url: string }> {
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
}
