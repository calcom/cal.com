import { Module } from "@nestjs/common";
import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { PrismaEventTypeRepository } from "@/lib/repositories/prisma-event-type.repository";
import { PrismaFeaturesRepository } from "@/lib/repositories/prisma-features.repository";
import { PrismaHolidayRepository } from "@/lib/repositories/prisma-holiday.repository";
import { PrismaMembershipRepository } from "@/lib/repositories/prisma-membership.repository";
import { PrismaOOORepository } from "@/lib/repositories/prisma-ooo.repository";
import { PrismaScheduleRepository } from "@/lib/repositories/prisma-schedule.repository";
import { PrismaSelectedSlotRepository } from "@/lib/repositories/prisma-selected-slot.repository";
import { PrismaUserRepository } from "@/lib/repositories/prisma-user.repository";
import { AvailableSlotsService } from "@/lib/services/available-slots.service";
import { BusyTimesService } from "@/lib/services/busy-times.service";
import { CheckBookingLimitsService } from "@/lib/services/check-booking-limits.service";
import { NoSlotsNotificationService } from "@/lib/services/no-slots-notification.service";
import { QualifiedHostsService } from "@/lib/services/qualified-hosts.service";
import { UserAvailabilityService } from "@/lib/services/user-availability.service";
import { PrismaWorkerModule } from "@/modules/prisma/prisma-worker.module";
import { RedisService } from "@/modules/redis/redis.service";

@Module({
  imports: [PrismaWorkerModule],
  providers: [
    PrismaOOORepository,
    PrismaHolidayRepository,
    PrismaScheduleRepository,
    PrismaBookingRepository,
    PrismaSelectedSlotRepository,
    PrismaUserRepository,
    PrismaEventTypeRepository,
    RedisService,
    PrismaFeaturesRepository,
    PrismaMembershipRepository,
    CheckBookingLimitsService,
    QualifiedHostsService,
    AvailableSlotsService,
    UserAvailabilityService,
    BusyTimesService,
    NoSlotsNotificationService,
  ],
  exports: [AvailableSlotsService],
})
export class AvailableSlotsModule {}
