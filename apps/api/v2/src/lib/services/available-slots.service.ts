import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { PrismaEventTypeRepository } from "@/lib/repositories/prisma-event-type.repository";
import { PrismaFeaturesRepository } from "@/lib/repositories/prisma-features.repository";
import { PrismaOOORepository } from "@/lib/repositories/prisma-ooo.repository";
import { PrismaRoutingFormResponseRepository } from "@/lib/repositories/prisma-routing-form-response.repository";
import { PrismaScheduleRepository } from "@/lib/repositories/prisma-schedule.repository";
import { PrismaSelectedSlotRepository } from "@/lib/repositories/prisma-selected-slot.repository";
import { PrismaTeamRepository } from "@/lib/repositories/prisma-team.repository";
import { PrismaUserRepository } from "@/lib/repositories/prisma-user.repository";
import { BusyTimesService } from "@/lib/services/busy-times.service";
import { CheckBookingLimitsService } from "@/lib/services/check-booking-limits.service";
import { NoSlotsNotificationService } from "@/lib/services/no-slots-notification.service";
import { QualifiedHostsService } from "@/lib/services/qualified-hosts.service";
import { RedisService } from "@/modules/redis/redis.service";
import { Injectable } from "@nestjs/common";

import { AvailableSlotsService as BaseAvailableSlotsService } from "@calcom/platform-libraries/slots";

import { UserAvailabilityService } from "./user-availability.service";

@Injectable()
export class AvailableSlotsService extends BaseAvailableSlotsService {
  constructor(
    oooRepoDependency: PrismaOOORepository,
    scheduleRepoDependency: PrismaScheduleRepository,
    teamRepository: PrismaTeamRepository,
    routingFormResponseRepository: PrismaRoutingFormResponseRepository,
    bookingRepository: PrismaBookingRepository,
    selectedSlotRepository: PrismaSelectedSlotRepository,
    eventTypeRepository: PrismaEventTypeRepository,
    userRepository: PrismaUserRepository,
    redisService: RedisService,
    featuresRepository: PrismaFeaturesRepository,
    qualifiedHostsService: QualifiedHostsService,
    checkBookingLimitsService: CheckBookingLimitsService,
    userAvailabilityService: UserAvailabilityService,
    busyTimesService: BusyTimesService,
    noSlotsNotificationService: NoSlotsNotificationService
  ) {
    super({
      oooRepo: oooRepoDependency,
      scheduleRepo: scheduleRepoDependency,
      teamRepo: teamRepository,
      routingFormResponseRepo: routingFormResponseRepository,
      bookingRepo: bookingRepository,
      selectedSlotRepo: selectedSlotRepository,
      eventTypeRepo: eventTypeRepository,
      userRepo: userRepository,
      redisClient: redisService,
      checkBookingLimitsService,
      userAvailabilityService,
      busyTimesService,
      qualifiedHostsService,
      featuresRepo: featuresRepository,
      noSlotsNotificationService,
    });
  }
}
