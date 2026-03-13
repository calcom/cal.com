import {
  RegularBookingService as BaseRegularBookingService,
  type IWebhookProducerService,
} from "@calcom/platform-libraries/bookings";
import type { ITeamFeatureRepository } from "@calcom/platform-libraries/pbac";
import type { PrismaClient } from "@calcom/prisma";
import { Inject, Injectable } from "@nestjs/common";
import { WEBHOOK_PRODUCER } from "@/lib/modules/regular-booking.tokens";
import { TEAM_FEATURE_REPOSITORY } from "@/lib/modules/team-feature-repository.tokens";
import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { PrismaUserRepository } from "@/lib/repositories/prisma-user.repository";
import { BookingEventHandlerService } from "@/lib/services/booking-event-handler.service";
import { CheckBookingAndDurationLimitsService } from "@/lib/services/check-booking-and-duration-limits.service";
import { HashedLinkService } from "@/lib/services/hashed-link.service";
import { LuckyUserService } from "@/lib/services/lucky-user.service";
import { BookingEmailAndSmsTasker } from "@/lib/services/tasker/booking-emails-sms-tasker.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

@Injectable()
export class RegularBookingService extends BaseRegularBookingService {
  constructor(
    checkBookingAndDurationLimitsService: CheckBookingAndDurationLimitsService,
    prismaWriteService: PrismaWriteService,
    bookingRepository: PrismaBookingRepository,
    hashedLinkService: HashedLinkService,
    luckyUserService: LuckyUserService,
    userRepository: PrismaUserRepository,
    bookingEmailAndSmsTasker: BookingEmailAndSmsTasker,
    bookingEventHandler: BookingEventHandlerService,
    @Inject(WEBHOOK_PRODUCER) webhookProducer: IWebhookProducerService,
    @Inject(TEAM_FEATURE_REPOSITORY) teamFeatureRepository: ITeamFeatureRepository
  ) {
    super({
      checkBookingAndDurationLimitsService,
      prismaClient: prismaWriteService.prisma as unknown as PrismaClient,
      bookingRepository,
      hashedLinkService,
      luckyUserService,
      userRepository,
      bookingEmailAndSmsTasker,
      teamFeatureRepository: teamFeatureRepository,
      bookingEventHandler,
      webhookProducer,
    });
  }
}
