import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { PrismaEventTypeRepository } from "@/lib/repositories/prisma-event-type.repository";
import { PrismaFeaturesRepository } from "@/lib/repositories/prisma-features.repository";
import { PrismaHolidayRepository } from "@/lib/repositories/prisma-holiday.repository";
import { PrismaMembershipRepository } from "@/lib/repositories/prisma-membership.repository";
import { PrismaOOORepository } from "@/lib/repositories/prisma-ooo.repository";
import { PrismaRoutingFormResponseRepository } from "@/lib/repositories/prisma-routing-form-response.repository";
import { PrismaScheduleRepository } from "@/lib/repositories/prisma-schedule.repository";
import { PrismaSelectedSlotRepository } from "@/lib/repositories/prisma-selected-slot.repository";
import { PrismaTeamRepository } from "@/lib/repositories/prisma-team.repository";
import { PrismaUserRepository } from "@/lib/repositories/prisma-user.repository";
import { AvailableSlotsService } from "@/lib/services/available-slots.service";
import { BusyTimesService } from "@/lib/services/busy-times.service";
import { CheckBookingLimitsService } from "@/lib/services/check-booking-limits.service";
import { FilterHostsService } from "@/lib/services/filter-hosts.service";
import { NoSlotsNotificationService } from "@/lib/services/no-slots-notification.service";
import { QualifiedHostsService } from "@/lib/services/qualified-hosts.service";
import { UserAvailabilityService } from "@/lib/services/user-availability.service";
import { PrismaWorkerModule } from "@/modules/prisma/prisma-worker.module";
import { RedisService } from "@/modules/redis/redis.service";
import { Module } from "@nestjs/common";

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
    PrismaRoutingFormResponseRepository,
    PrismaTeamRepository,
    RedisService,
    PrismaFeaturesRepository,
    PrismaMembershipRepository,
    CheckBookingLimitsService,
    AvailableSlotsService,
    UserAvailabilityService,
    BusyTimesService,
    FilterHostsService,
    QualifiedHostsService,
    NoSlotsNotificationService,
  ],
  exports: [AvailableSlotsService],
})
export class AvailableSlotsModule {}
