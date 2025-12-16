import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { PrismaFeaturesRepository } from "@/lib/repositories/prisma-features.repository";
import { UpdateManagedUserInput } from "@/modules/users/inputs/update-managed-user.input";
import { UserWithProfile, UsersRepository } from "@/modules/users/users.repository";
import { Injectable } from "@nestjs/common";

import { sendChangeOfEmailVerification } from "@calcom/platform-libraries/emails";
import type { Prisma } from "@calcom/prisma/client";

export interface UpdateMeResult {
  updatedUser: UserWithProfile;
}

@Injectable()
export class MeService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly schedulesService: SchedulesService_2024_04_15,
    private readonly featuresRepository: PrismaFeaturesRepository
  ) {}

  async updateMe(params: {
    user: UserWithProfile;
    updateData: UpdateManagedUserInput;
  }): Promise<UpdateMeResult> {
    const { user, updateData } = params;
    const update = { ...updateData };

    const isEmailVerificationEnabled = user.isPlatformManaged
      ? false
      : await this.featuresRepository.checkIfFeatureIsEnabledGlobally("email-verification");

    const hasEmailBeenChanged = update.email && user.email !== update.email;
    const newEmail = update.email;
    let sendEmailVerification = false;

    if (hasEmailBeenChanged && newEmail && isEmailVerificationEnabled) {
      const secondaryEmail = await this.usersRepository.findVerifiedSecondaryEmail(user.id, newEmail);

      if (!secondaryEmail?.emailVerified) {
        update.metadata = {
          ...(user.metadata as Prisma.JsonObject),
          ...(update.metadata || {}),
          emailChangeWaitingForVerification: newEmail.toLowerCase(),
        };

        delete update.email;
        sendEmailVerification = true;
      } else {
        // When changing to a verified secondary email, swap the emails:
        await this.usersRepository.swapPrimaryAndSecondaryEmail(
          user.id,
          secondaryEmail.id,
          user.email,
          user.emailVerified
        );
      }
    }

    // Filter out undefined values and only update if there are actual fields to update
    const filteredUpdate = Object.entries(update).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        // @ts-expect-error Element implicitly has any type
        acc[key] = value;
      }
      return acc;
    }, {} as UpdateManagedUserInput);

    const updatedUser =
      Object.keys(filteredUpdate).length > 0
        ? await this.usersRepository.update(user.id, filteredUpdate)
        : user;

    if (update.timeZone && user.defaultScheduleId) {
      await this.schedulesService.updateUserSchedule(user, user.defaultScheduleId, {
        timeZone: update.timeZone,
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

    return {
      updatedUser,
    };
  }
}
