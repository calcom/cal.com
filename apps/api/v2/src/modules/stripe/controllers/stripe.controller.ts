import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import {
  StripConnectOutputDto,
  StripConnectOutputResponseDto,
  StripCredentialsCheckOutputResponseDto,
  StripCredentialsSaveOutputResponseDto,
} from "@/modules/stripe/outputs/stripe.output";
import { StripeService } from "@/modules/stripe/stripe.service";
import { getOnErrorReturnToValueFromQueryState } from "@/modules/stripe/utils/getReturnToValueFromQueryState";
import { UserWithProfile } from "@/modules/users/users.repository";
import {
  Controller,
  Query,
  UseGuards,
  Get,
  HttpCode,
  HttpStatus,
  Redirect,
  Req,
  BadRequestException,
  Headers,
  Param,
} from "@nestjs/common";
import { ApiTags as DocsTags, ApiOperation } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";
import { Request } from "express";
import { stringify } from "querystring";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

@Controller({
  path: "/v2/stripe",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Stripe")
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Get("/connect")
  @UseGuards(ApiAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get stripe connect URL" })
  async redirect(
    @Req() req: Request,
    @Headers("Authorization") authorization: string,
    @GetUser() user: UserWithProfile,
    @Query("redir") redir?: string | null,
    @Query("errorRedir") errorRedir?: string | null,
    @Query("teamId") teamId?: string | null
  ): Promise<StripConnectOutputResponseDto> {
    const origin = req.headers.origin;
    const accessToken = authorization.replace("Bearer ", "");

    const state = {
      onErrorReturnTo: !!errorRedir ? errorRedir : origin,
      fromApp: false,
      returnTo: !!redir ? redir : origin,
      accessToken,
      teamId: Number(teamId) ?? null,
    };

    const stripeRedirectUrl = await this.stripeService.getStripeRedirectUrl(
      JSON.stringify(state),
      user.email,
      user.name
    );

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(StripConnectOutputDto, { authUrl: stripeRedirectUrl }, { strategy: "excludeAll" }),
    };
  }

  @Get("/save")
  @UseGuards()
  @Redirect(undefined, 301)
  @ApiOperation({ summary: "Save stripe credentials" })
  async save(
    @Query("state") state: string,
    @Query("code") code: string,
    @Query("error") error: string | undefined,
    @Query("error_description") error_description: string | undefined
  ): Promise<StripCredentialsSaveOutputResponseDto> {
    const accessToken = JSON.parse(state).accessToken;

    // user cancels flow
    if (error === "access_denied") {
      return { url: getOnErrorReturnToValueFromQueryState(state) };
    }

    if (error) {
      throw new BadRequestException(stringify({ error, error_description }));
    }

    return await this.stripeService.saveStripeAccount(state, code, accessToken);
  }

  @Get("/check")
  @UseGuards(ApiAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Check stripe connection" })
  async check(@GetUser() user: UserWithProfile): Promise<StripCredentialsCheckOutputResponseDto> {
    return await this.stripeService.checkIfIndividualStripeAccountConnected(user.id);
  }

  @Get("/check/:teamId")
  @UseGuards(ApiAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Check team stripe connection" })
  async checkTeamStripeConnection(
    @Param("teamId") teamId: string
  ): Promise<StripCredentialsCheckOutputResponseDto> {
    return await this.stripeService.checkIfTeamStripeAccountConnected(Number(teamId));
  }
}
