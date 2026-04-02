import { ApiResponse } from "@calcom/platform-types";
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiExcludeController } from "@nestjs/swagger";
import { Request } from "express";
import Stripe from "stripe";
import { AppConfig } from "@/config/type";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { ApiAuthGuardOnlyAllow } from "@/modules/auth/decorators/api-auth-guard-only-allow.decorator";
import { MembershipRoles } from "@/modules/auth/decorators/roles/membership-roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { OrganizationRolesGuard } from "@/modules/auth/guards/organization-roles/organization-roles.guard";
import { SubscribeToPlanInput } from "@/modules/billing/controllers/inputs/subscribe-to-plan.input";
import { CheckPlatformBillingResponseDto } from "@/modules/billing/controllers/outputs/CheckPlatformBillingResponse.dto";
import { SubscribeTeamToBillingResponseDto } from "@/modules/billing/controllers/outputs/SubscribeTeamToBillingResponse.dto";
import { IsUserInBillingOrg } from "@/modules/billing/guards/is-user-in-billing-org";
import { IBillingService } from "@/modules/billing/interfaces/billing-service.interface";
import { StripeService } from "@/modules/stripe/stripe.service";

@Controller({
  path: "/v2/billing",
  version: API_VERSIONS_VALUES,
})
@ApiExcludeController(true)
export class BillingController {
  private readonly stripeWhSecret: string;
  private logger = new Logger("Billing Controller");

  constructor(
    @Inject("IBillingService") private readonly billingService: IBillingService,
    public readonly stripeService: StripeService,
    private readonly configService: ConfigService<AppConfig>
  ) {
    this.stripeWhSecret = configService.get("stripe.webhookSecret", { infer: true }) ?? "";
  }

  @Get("/:teamId/check")
  @UseGuards(ApiAuthGuard, OrganizationRolesGuard, IsUserInBillingOrg)
  @MembershipRoles(["OWNER", "ADMIN", "MEMBER"])
  @ApiAuthGuardOnlyAllow(["NEXT_AUTH"])
  async checkTeamBilling(
    @Param("teamId", ParseIntPipe) teamId: number
  ): Promise<ApiResponse<CheckPlatformBillingResponseDto>> {
    const { status, plan } = await this.billingService.getBillingData(teamId);

    return {
      status: "success",
      data: {
        valid: status === "valid",
        plan,
      },
    };
  }

  @Post("/:teamId/subscribe")
  @UseGuards(ApiAuthGuard, OrganizationRolesGuard, IsUserInBillingOrg)
  @MembershipRoles(["OWNER", "ADMIN"])
  @ApiAuthGuardOnlyAllow(["NEXT_AUTH"])
  async subscribeTeamToStripe(
    @Param("teamId") teamId: number,
    @Body() input: SubscribeToPlanInput
  ): Promise<ApiResponse<SubscribeTeamToBillingResponseDto | undefined>> {
    const customerId = await this.billingService.createTeamBilling(teamId);
    const url = await this.billingService.redirectToSubscribeCheckout(teamId, input.plan, customerId);

    return {
      status: "success",
      data: {
        url,
      },
    };
  }

  @Post("/:teamId/upgrade")
  @UseGuards(ApiAuthGuard, OrganizationRolesGuard, IsUserInBillingOrg)
  @MembershipRoles(["OWNER", "ADMIN"])
  @ApiAuthGuardOnlyAllow(["NEXT_AUTH"])
  async upgradeTeamBillingInStripe(
    @Param("teamId") teamId: number,
    @Body() input: SubscribeToPlanInput
  ): Promise<ApiResponse<SubscribeTeamToBillingResponseDto | undefined>> {
    const url = await this.billingService.updateSubscriptionForTeam(teamId, input.plan);

    return {
      status: "success",
      data: {
        url,
      },
    };
  }

  @Delete("/:teamId/unsubscribe")
  @UseGuards(ApiAuthGuard, OrganizationRolesGuard, IsUserInBillingOrg)
  @MembershipRoles(["OWNER", "ADMIN"])
  @ApiAuthGuardOnlyAllow(["NEXT_AUTH"])
  async cancelTeamSubscriptionInStripe(@Param("teamId") teamId: number): Promise<ApiResponse> {
    await this.billingService.cancelTeamSubscription(teamId);

    return {
      status: "success",
    };
  }

  @Post("/webhook")
  @HttpCode(HttpStatus.OK)
  async stripeWebhook(
    @Req() request: Request,
    @Headers("stripe-signature") stripeSignature: string
  ): Promise<ApiResponse> {
    try {
      if (!stripeSignature) {
        this.logger.warn("Missing stripe-signature header in webhook request");
        return {
          status: "success",
        };
      }

      if (!this.stripeWhSecret) {
        this.logger.error("Missing STRIPE_WEBHOOK_SECRET configuration");
        return {
          status: "success",
        };
      }

      const event = await this.billingService.stripeService
        .getStripe()
        .webhooks.constructEventAsync(request.body, stripeSignature, this.stripeWhSecret);

      switch (event.type) {
        case "checkout.session.completed":
          await this.billingService.handleStripeCheckoutEvents(event);
          break;
        case "customer.subscription.updated":
          await this.billingService.handleStripePaymentPastDue(event);
          break;
        case "customer.subscription.deleted":
          await this.billingService.handleStripeSubscriptionDeleted(event);
          break;
        case "invoice.created":
          await this.billingService.handleStripeSubscriptionForActiveManagedUsers(event);
          break;
        case "invoice.payment_failed":
          await this.billingService.handleStripePaymentFailed(event);
          break;
        case "invoice.payment_succeeded":
          await this.billingService.handleStripePaymentSuccess(event);
          break;
        default:
          break;
      }

      return {
        status: "success",
      };
    } catch (error) {
      if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
        this.logger.error("Webhook signature validation failed", error);
        return {
          status: "success",
        };
      }
      throw error;
    }
  }
}
