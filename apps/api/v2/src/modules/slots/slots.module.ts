import { Module } from "@nestjs/common";
import { EventTypesModule_2024_04_15 } from "src/ee/event-types/event-types_2024_04_15/event-types.module";
import { PrismaModule } from "src/modules/prisma/prisma.module";
import { SlotsController } from "src/modules/slots/controllers/slots.controller";
import { SlotsService } from "src/modules/slots/services/slots.service";
import { SlotsRepository } from "src/modules/slots/slots.repository";

@Module({
  imports: [PrismaModule, EventTypesModule_2024_04_15],
  providers: [SlotsRepository, SlotsService],
  controllers: [SlotsController],
  exports: [SlotsService],
})
export class SlotsModule {}
