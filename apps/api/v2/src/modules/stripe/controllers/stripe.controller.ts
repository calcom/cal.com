import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { StripeConnectQueryParamsInputDto } from "@/modules/stripe/inputs/stripe.input";
import { StripConnectOutputDto, StripConnectOutputResponseDto } from "@/modules/stripe/outputs/stripe.output";
import { StripeService } from "@/modules/stripe/stripe.service";
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
} from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";
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
  async redirect(
    @Req() req: Request,
    @Query("redir") redir: StripeConnectQueryParamsInputDto,
    @GetUser() user: UserWithProfile
  ): Promise<StripConnectOutputResponseDto> {
    const origin = req.headers.origin;
    const { redir: redirectUrl } = redir;
    const state = {
      onErrorReturnTo: origin,
      fromApp: false,
      returnTo: !!redirectUrl ? redirectUrl : origin,
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
  @UseGuards(ApiAuthGuard)
  @Redirect(undefined, 301)
  async save(
    @Query("state") state: string | string[] | undefined,
    @Query("code") code: string | string[] | undefined,
    @Query("error") error: string | string[] | undefined,
    @Query("error_description") error_description: string | string[] | undefined,
    @GetUser() user: UserWithProfile
  ): Promise<{ url: string }> {
    if (error) {
      throw new BadRequestException(stringify({ error, error_description }));
    }

    return await this.stripeService.saveStripeAccount(code, state, user.id);
  }
}
