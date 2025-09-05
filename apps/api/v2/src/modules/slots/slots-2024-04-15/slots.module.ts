import { Module } from "@nestjs/common";
import { EventTypesModule_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/event-types.module";
import { AvailableSlotsModule } from "@/lib/modules/available-slots.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { SlotsController_2024_04_15 } from "@/modules/slots/slots-2024-04-15/controllers/slots.controller";
import { SlotsService_2024_04_15 } from "@/modules/slots/slots-2024-04-15/services/slots.service";
import { SlotsOutputService_2024_04_15 } from "@/modules/slots/slots-2024-04-15/services/slots-output.service";
import { SlotsWorkerService_2024_04_15 } from "@/modules/slots/slots-2024-04-15/services/slots-worker.service";
import { SlotsRepository_2024_04_15 } from "@/modules/slots/slots-2024-04-15/slots.repository";

@Module({
  imports: [PrismaModule, EventTypesModule_2024_04_15, AvailableSlotsModule],
  providers: [
    SlotsRepository_2024_04_15,
    SlotsService_2024_04_15,
    SlotsOutputService_2024_04_15,
    SlotsWorkerService_2024_04_15,
  ],
  controllers: [SlotsController_2024_04_15],
  exports: [SlotsService_2024_04_15],
})
export class SlotsModule_2024_04_15 {}
