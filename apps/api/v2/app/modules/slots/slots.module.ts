import { Module } from "@nestjs/common";
import { EventTypesModule_2024_04_15 } from "app/ee/event-types/event-types_2024_04_15/event-types.module";
import { PrismaModule } from "app/modules/prisma/prisma.module";
import { SlotsController } from "app/modules/slots/controllers/slots.controller";
import { SlotsService } from "app/modules/slots/services/slots.service";
import { SlotsRepository } from "app/modules/slots/slots.repository";

@Module({
  imports: [PrismaModule, EventTypesModule_2024_04_15],
  providers: [SlotsRepository, SlotsService],
  controllers: [SlotsController],
  exports: [SlotsService],
})
export class SlotsModule {}
