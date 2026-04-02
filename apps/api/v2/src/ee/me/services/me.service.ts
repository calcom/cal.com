import { sendChangeOfEmailVerification } from "@calcom/platform-libraries/emails";
import type { Prisma } from "@calcom/prisma/client";
import { Injectable } from "@nestjs/common";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { PrismaFeaturesRepository } from "@/lib/repositories/prisma-features.repository";
import { UpdateManagedUserInput } from "@/modules/users/inputs/update-managed-user.input";
import { UsersRepository, UserWithProfile } from "@/modules/users/users.repository";

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

    if (update.timeZone && user.defaultScheduleId) {
      await this.schedulesService.updateUserSchedule(user, user.defaultScheduleId, {
        timeZone: update.timeZone,
      });
    }

    const isEmailVerificationEnabled = user.isPlatformManaged
      ? false
      : await this.featuresRepository.checkIfFeatureIsEnabledGlobally("email-verification");

    const hasEmailBeenChanged = update.email && user.email !== update.email;
    const newEmail = update.email;
    let sendEmailVerification = false;

    if (hasEmailBeenChanged && newEmail && isEmailVerificationEnabled) {
      const secondaryEmail = await this.usersRepository.findVerifiedSecondaryEmail(user.id, newEmail);

      if (secondaryEmail && secondaryEmail.emailVerified) {
        const updatedUser = await this.usersRepository.swapPrimaryEmailWithSecondaryEmail(
          user.id,
          secondaryEmail.id,
          user.email,
          user.emailVerified,
          newEmail
        );

        return {
          updatedUser,
        };
      } else {
        update.metadata = {
          ...(user.metadata as Prisma.JsonObject),
          ...(update.metadata || {}),
          emailChangeWaitingForVerification: newEmail.toLowerCase(),
        };

        delete update.email;
        sendEmailVerification = true;
      }
    }

    const updatedUser =
      Object.keys(update).length > 0 ? await this.usersRepository.update(user.id, update) : user;

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
