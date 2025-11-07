import { GetMeOutput } from "@/ee/me/outputs/get-me.output";
import { UpdateMeOutput } from "@/ee/me/outputs/update-me.output";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_OR_ACCESS_TOKEN_HEADER } from "@/lib/docs/headers";
import { PrismaFeaturesRepository } from "@/lib/repositories/prisma-features.repository";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { UpdateManagedUserInput } from "@/modules/users/inputs/update-managed-user.input";
import { UsersService } from "@/modules/users/services/users.service";
import { UserWithProfile, UsersRepository } from "@/modules/users/users.repository";
import { Controller, UseGuards, Get, Patch, Body } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";

import { sendChangeOfEmailVerification } from "@calcom/features/auth/lib/verifyEmail";
import { PROFILE_READ, PROFILE_WRITE, SUCCESS_STATUS } from "@calcom/platform-constants";
import { userSchemaResponse } from "@calcom/platform-types";

@Controller({
  path: "/v2/me",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, PermissionsGuard)
@DocsTags("Me")
@ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
export class MeController {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly schedulesService: SchedulesService_2024_04_15,
    private readonly usersService: UsersService,
    private readonly featuresRepository: PrismaFeaturesRepository
  ) {}

  @Get("/")
  @Permissions([PROFILE_READ])
  @ApiOperation({ summary: "Get my profile" })
  async getMe(@GetUser() user: UserWithProfile): Promise<GetMeOutput> {
    const organization = this.usersService.getUserMainProfile(user)?.organization;
    const me = userSchemaResponse.parse(
      organization
        ? {
            ...user,
            organizationId: organization.id,
            organization: {
              id: organization.id,
              isPlatform: organization.isPlatform,
            },
          }
        : user
    );
    return {
      status: SUCCESS_STATUS,
      data: me,
    };
  }

  @Patch("/")
  @Permissions([PROFILE_WRITE])
  @ApiOperation({ summary: "Update my profile" })
  async updateMe(
    @GetUser() user: UserWithProfile,
    @Body() bodySchedule: UpdateManagedUserInput
  ): Promise<UpdateMeOutput> {
    const emailVerification = await this.featuresRepository.checkIfFeatureIsEnabledGlobally(
      "email-verification"
    );

    const hasEmailBeenChanged = bodySchedule.email && user.email !== bodySchedule.email;
    const newEmail = bodySchedule.email;
    let sendEmailVerification = false;

    let secondaryEmail:
      | {
          id: number;
          emailVerified: Date | null;
        }
      | null
      | undefined;

    if (hasEmailBeenChanged && newEmail) {
      secondaryEmail = await this.usersRepository.findVerifiedSecondaryEmail(user.id, newEmail);

      if (emailVerification) {
        if (!secondaryEmail?.emailVerified) {
          const userMetadata = typeof user.metadata === "object" ? user.metadata : {};
          bodySchedule.metadata = {
            ...userMetadata,
            ...bodySchedule.metadata,
            emailChangeWaitingForVerification: newEmail.toLowerCase(),
          };

          delete bodySchedule.email;
          sendEmailVerification = true;
        }
      }
    }

    const updatedUser = await this.usersRepository.update(user.id, bodySchedule);

    if (bodySchedule.timeZone && user.defaultScheduleId) {
      await this.schedulesService.updateUserSchedule(user, user.defaultScheduleId, {
        timeZone: bodySchedule.timeZone,
      });
    }

    if (sendEmailVerification && newEmail) {
      await sendChangeOfEmailVerification({
        user: {
          username: updatedUser.username ?? "Nameless User",
          emailFrom: user.email,
          emailTo: newEmail,
        },
      });
    }

    const me = userSchemaResponse.parse(updatedUser);

    return {
      status: SUCCESS_STATUS,
      data: me,
      hasEmailBeenChanged: hasEmailBeenChanged || undefined,
      sendEmailVerification: sendEmailVerification || undefined,
    };
  }
}
