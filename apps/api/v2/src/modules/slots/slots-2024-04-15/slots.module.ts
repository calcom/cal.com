import { EventTypesModule_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/event-types.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { SlotsController_2024_04_15 } from "@/modules/slots/slots-2024-04-15/controllers/slots.controller";
import { SlotsOutputService_2024_04_15 } from "@/modules/slots/slots-2024-04-15/services/slots-output.service";
import { SlotsService_2024_04_15 } from "@/modules/slots/slots-2024-04-15/services/slots.service";
import { SlotsRepository_2024_04_15 } from "@/modules/slots/slots-2024-04-15/slots.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, EventTypesModule_2024_04_15],
  providers: [SlotsRepository_2024_04_15, SlotsService_2024_04_15, SlotsOutputService_2024_04_15],
  controllers: [SlotsController_2024_04_15],
  exports: [SlotsService_2024_04_15],
})
export class SlotsModule_2024_04_15 {}
