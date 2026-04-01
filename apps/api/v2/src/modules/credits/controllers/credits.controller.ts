import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { ChargeCreditsInput } from "@/modules/credits/controllers/inputs/charge-credits.input";
import type { ChargeCreditsDataDto } from "@/modules/credits/controllers/outputs/charge-credits.output";
import type { CreditsAvailableDataDto } from "@/modules/credits/controllers/outputs/credits-available.output";
import { CreditsService } from "@/modules/credits/services/credits.service";
import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "/v2/credits",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard)
@ApiTags("Credits")
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  @Get("/available")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Check available credits",
    description:
      "Check if the authenticated user (or their org/team) has available credits and return the current balance.",
  })
  async getAvailableCredits(
    @GetUser("id") userId: number
  ): Promise<ApiResponse<CreditsAvailableDataDto>> {
    const result = await this.creditsService.getAvailableCredits({ userId });

    return {
      status: SUCCESS_STATUS,
      data: result,
    };
  }

  @Post("/charge")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Charge credits",
    description:
      "Charge credits for a completed AI agent interaction. Uses externalRef for idempotency to prevent double-charging.",
  })
  async chargeCredits(
    @GetUser("id") userId: number,
    @Body() body: ChargeCreditsInput
  ): Promise<ApiResponse<ChargeCreditsDataDto>> {
    const result = await this.creditsService.chargeCredits({
      userId,
      credits: body.credits,
      creditFor: body.creditFor,
      externalRef: body.externalRef,
    });

    return {
      status: SUCCESS_STATUS,
      data: result,
    };
  }
}
