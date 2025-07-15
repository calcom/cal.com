import { PrismaBookingRepository } from "@/lib/repositories/prismaBookingRepository";
import { PrismaEventTypeRepository } from "@/lib/repositories/prismaEventTypeRepository";
import { PrismaOOORepository } from "@/lib/repositories/prismaOOORepository";
import { PrismaRoutingFormResponseRepository } from "@/lib/repositories/prismaRoutingFormResponseRepository";
import { PrismaScheduleRepository } from "@/lib/repositories/prismaScheduleRepository";
import { PrismaSelectedSlotsRepository } from "@/lib/repositories/prismaSelectedSlotsRepository";
import { PrismaTeamRepository } from "@/lib/repositories/prismaTeamRepository";
import { PrismaUserRepository } from "@/lib/repositories/prismaUserRepository";
import { AvailableSlotsService } from "@/lib/services/availableSlotsService";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaOOORepository,
    PrismaScheduleRepository,
    PrismaBookingRepository,
    PrismaSelectedSlotsRepository,
    PrismaUserRepository,
    PrismaEventTypeRepository,
    PrismaRoutingFormResponseRepository,
    PrismaTeamRepository,
    AvailableSlotsService,
  ],
  exports: [AvailableSlotsService],
})
export class AvailableSlotsModule {}
