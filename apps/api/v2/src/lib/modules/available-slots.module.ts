import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { PrismaEventTypeRepository } from "@/lib/repositories/prisma-event-type.repository";
import { PrismaOOORepository } from "@/lib/repositories/prisma-ooo.repository";
import { PrismaRoutingFormResponseRepository } from "@/lib/repositories/prisma-routing-form-response.repository";
import { PrismaScheduleRepository } from "@/lib/repositories/prisma-schedule.repository";
import { PrismaSelectedSlotRepository } from "@/lib/repositories/prisma-selected-slot.repository";
import { PrismaTeamRepository } from "@/lib/repositories/prisma-team.repository";
import { PrismaUserRepository } from "@/lib/repositories/prisma-user.repository";
import { AvailableSlotsService } from "@/lib/services/available-slots.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaOOORepository,
    PrismaScheduleRepository,
    PrismaBookingRepository,
    PrismaSelectedSlotRepository,
    PrismaUserRepository,
    PrismaEventTypeRepository,
    PrismaRoutingFormResponseRepository,
    PrismaTeamRepository,
    AvailableSlotsService,
  ],
  exports: [AvailableSlotsService],
})
export class AvailableSlotsModule {}
