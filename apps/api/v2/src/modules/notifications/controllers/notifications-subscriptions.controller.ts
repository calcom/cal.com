import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ErrorWithCode, getHttpStatusCode } from "@calcom/platform-libraries/errors";
import { Body, Controller, Delete, HttpException, NotFoundException, Post, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";
import { AppPushSubscriptionOutputDto } from "../outputs/app-push-subscription.output";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_HEADER } from "@/lib/docs/headers";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { RegisterAppPushSubscriptionInput } from "@/modules/notifications/inputs/register-app-push-subscription.input";
import { RemoveAppPushSubscriptionInput } from "@/modules/notifications/inputs/remove-app-push-subscription.input";
import {
  AppPushSubscriptionResponseDto,
  RemoveAppPushSubscriptionResponseDto,
} from "@/modules/notifications/outputs/app-push-subscription.output";
import { NotificationsSubscriptionsService } from "@/modules/notifications/services/notifications-subscriptions.service";
import type { UserWithProfile } from "@/modules/users/users.repository";

@Controller({
  path: "/v2/notifications/subscriptions/app-push",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard)
@DocsTags("Notifications")
@ApiHeader(API_KEY_HEADER)
export class NotificationsSubscriptionsController {
  constructor(private readonly service: NotificationsSubscriptionsService) {}

  @Post("/")
  @ApiOperation({ summary: "Register an app push subscription" })
  async register(
    @Body() body: RegisterAppPushSubscriptionInput,
    @GetUser() user: UserWithProfile
  ): Promise<AppPushSubscriptionResponseDto> {
    try {
      const subscription = await this.service.registerAppPush(user.id, {
        token: body.token,
        platform: body.platform,
        deviceId: body.deviceId,
      });

      return {
        status: SUCCESS_STATUS,
        data: plainToClass(AppPushSubscriptionOutputDto, subscription, { strategy: "excludeAll" }),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (error instanceof ErrorWithCode) {
        throw new HttpException(error.message, getHttpStatusCode(error));
      }
      throw error;
    }
  }

  @Delete("/")
  @ApiOperation({ summary: "Remove an app push subscription" })
  async remove(
    @Body() body: RemoveAppPushSubscriptionInput,
    @GetUser() user: UserWithProfile
  ): Promise<RemoveAppPushSubscriptionResponseDto> {
    try {
      const result = await this.service.removeAppPush(user.id, { token: body.token });

      if (!result.success) {
        throw new NotFoundException("App push subscription not found for the given token");
      }

      return {
        status: SUCCESS_STATUS,
        message: "App push subscription removed successfully",
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (error instanceof ErrorWithCode) {
        throw new HttpException(error.message, getHttpStatusCode(error));
      }
      throw error;
    }
  }
}
