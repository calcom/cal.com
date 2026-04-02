import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { HttpService } from "@nestjs/axios";
import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Query,
  Redirect,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";
import { Request } from "express";
import { stringify } from "querystring";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_OR_ACCESS_TOKEN_HEADER } from "@/lib/docs/headers";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import {
  StripConnectOutputDto,
  StripConnectOutputResponseDto,
  StripCredentialsCheckOutputResponseDto,
  StripCredentialsSaveOutputResponseDto,
} from "@/modules/stripe/outputs/stripe.output";
import { OAuthCallbackState, StripeService } from "@/modules/stripe/stripe.service";
import { getOnErrorReturnToValueFromQueryState } from "@/modules/stripe/utils/getReturnToValueFromQueryState";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { UserWithProfile } from "@/modules/users/users.repository";

@Controller({
  path: "/v2/stripe",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Stripe")
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly tokensRepository: TokensRepository,
    private readonly httpService: HttpService,
    private readonly config: ConfigService
  ) {}

  @Get("/connect")
  @UseGuards(ApiAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get Stripe connect URL" })
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  async redirect(
    @Req() req: Request,
    @Headers("Authorization") authorization: string,
    @GetUser() user: UserWithProfile,
    @Query("returnTo") returnTo?: string | null,
    @Query("onErrorReturnTo") onErrorReturnTo?: string | null
  ): Promise<StripConnectOutputResponseDto> {
    const origin = req.headers.origin;
    const accessToken = authorization.replace("Bearer ", "");

    const state: OAuthCallbackState = {
      onErrorReturnTo: onErrorReturnTo ? onErrorReturnTo : origin,
      fromApp: false,
      returnTo: returnTo ? returnTo : origin,
      accessToken,
    };

    const stripeRedirectUrl = await this.stripeService.getStripeRedirectUrl(state, user.email, user.name);

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(StripConnectOutputDto, { authUrl: stripeRedirectUrl }, { strategy: "excludeAll" }),
    };
  }

  @Get("/save")
  @UseGuards()
  @Redirect(undefined, 301)
  @ApiOperation({ summary: "Save Stripe credentials" })
  /**
   * Handles saving Stripe credentials.
   * If both orgId and teamId are present in the callback state, the request is proxied to the organization/team-level endpoint;
   * otherwise, credentials are saved at the user level.
   *
   * Proxying ensures that permission checks—such as whether the user is allowed to install Stripe for a team or organization—
   * are enforced via controller route guards, avoiding duplication of this logic within the service layer.
   */
  async save(
    @Query("state") state: string,
    @Query("code") code: string,
    @Query("error") error: string | undefined,
    @Query("error_description") error_description: string | undefined
  ): Promise<StripCredentialsSaveOutputResponseDto> {
    if (!state) {
      throw new BadRequestException("Missing `state` query param");
    }

    const decodedCallbackState: OAuthCallbackState = JSON.parse(state);
    try {
      // If teamId is present, proxy to team endpoint
      if (decodedCallbackState.teamId && decodedCallbackState.orgId) {
        let url = "";
        const apiUrl = this.config.get("api.url");
        url = `${apiUrl}/organizations/${decodedCallbackState.orgId}/teams/${decodedCallbackState.teamId}/stripe/save`;

        const params: Record<string, string | undefined> = { state, code, error, error_description };
        const headers = {
          Authorization: `Bearer ${decodedCallbackState.accessToken}`,
        };
        try {
          const response = await this.httpService.axiosRef.get(url, { params, headers });
          const redirectUrl = response.data?.url || decodedCallbackState.onErrorReturnTo || "";
          return { url: redirectUrl };
        } catch (err) {
          const fallbackUrl = decodedCallbackState.onErrorReturnTo || "";
          return { url: fallbackUrl };
        }
      }

      // user-level fallback
      const userId = await this.tokensRepository.getAccessTokenOwnerId(decodedCallbackState.accessToken);

      // user cancels flow
      if (error === "access_denied") {
        return { url: getOnErrorReturnToValueFromQueryState(state) };
      }

      if (error) {
        throw new BadRequestException(stringify({ error, error_description }));
      }

      if (!userId) {
        throw new BadRequestException("Invalid Access token.");
      }

      return await this.stripeService.saveStripeAccount(decodedCallbackState, code, userId);
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message);
      }
      return {
        url: decodedCallbackState.onErrorReturnTo ?? "",
      };
    }
  }

  @Get("/check")
  @UseGuards(ApiAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Check Stripe connection" })
  async check(@GetUser() user: UserWithProfile): Promise<StripCredentialsCheckOutputResponseDto> {
    return await this.stripeService.checkIfIndividualStripeAccountConnected(user.id);
  }
}
