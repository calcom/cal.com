import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { StripConnectOutputDto, StripConnectOutputResponseDto } from "@/modules/stripe/outputs/stripe.output";
import { StripeService } from "@/modules/stripe/stripe.service";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Controller, Query, UseGuards, Get } from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";

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
  async redirect(
    @Query("state") state: string,
    @GetUser() user: UserWithProfile
  ): Promise<StripConnectOutputResponseDto> {
    const stripeRedirectUrl = await this.stripeService.getStripeRedirectUrl(state, user.email, user.name);

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(StripConnectOutputDto, { authUrl: stripeRedirectUrl }, { strategy: "excludeAll" }),
    };
  }
}
