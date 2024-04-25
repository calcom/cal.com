import { BaseApiResponseDto } from "@/lib/response/response.dto";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { NextAuthGuard } from "@/modules/auth/guards/next-auth/next-auth.guard";
import { OrganizationRolesGuard } from "@/modules/auth/guards/organization-roles/organization-roles.guard";
import { BillingService } from "@/modules/billing/billing.service";
import { SubscribeToPlanInput } from "@/modules/billing/controllers/inputs/subscribe-to-plan.input";
import { CheckPlatformBillingResponseDto } from "@/modules/billing/controllers/resposnes/CheckPlatformBillingResponse.dto";
import { SubscribeTeamToBillingResponseDto } from "@/modules/billing/controllers/resposnes/SubscribeTeamToBillingResponse.dto";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  Headers,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { Request } from "express";
import { Stripe } from "stripe";

import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "/billing",
  version: "2",
})
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get("/:teamId/check")
  @UseGuards(NextAuthGuard, OrganizationRolesGuard)
  @Roles(["OWNER", "ADMIN"])
  async checkTeamBilling(@Param("teamId") teamId: number): Promise<CheckPlatformBillingResponseDto> {
    const teamBilling = await this.billingService.checkIfTeamHasBillingEnabled(teamId);

    return {
      status: "success",
      valid: teamBilling.status === "valid",
    };
  }

  @Post("/:teamId/subscribe")
  @UseGuards(NextAuthGuard, OrganizationRolesGuard)
  @Roles(["OWNER", "ADMIN"])
  async subscribeTeamToStripe(
    @Param("teamId") teamId: number,
    @Body() input: SubscribeToPlanInput
  ): Promise<SubscribeTeamToBillingResponseDto> {
    const teamBillingEnabled = await this.billingService.checkIfTeamHasBillingEnabled(teamId);

    if (teamBillingEnabled.status === "valid") {
      throw new BadRequestException("This team is already subscribed to a plan.");
    }

    const { status, url } = await this.billingService.createSubscriptionForTeam(teamId, input.plan);
    if (status === "redirect") {
      return {
        status: "redirect",
        url,
      };
    }

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
    const event = await this.billingService.stripeService.stripe.webhooks.constructEventAsync(
      request.body,
      stripeSignature,
      ""
    );
    if (event.type === "customer.subscription.created.created") {
      const subscription = event.data as Stripe.Subscription;
      const teamId = Number.parseInt(subscription.metadata.teamId);

      await this.billingService.setSubscriptionForTeam(teamId, subscription);

      return {
        status: "success",
      };
    }

    throw new BadRequestException(`Unhandled event type ${event.type}`);
  }
}
