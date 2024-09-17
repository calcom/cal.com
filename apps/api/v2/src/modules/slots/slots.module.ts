import { Module } from "@nestjs/common";

import { EventTypesModule_2024_04_15 } from "../../ee/event-types/event-types_2024_04_15/event-types.module";
import { PrismaModule } from "../prisma/prisma.module";
import { SlotsController } from "../slots/controllers/slots.controller";
import { SlotsService } from "../slots/services/slots.service";
import { SlotsRepository } from "../slots/slots.repository";

@Module({
  imports: [PrismaModule, EventTypesModule_2024_04_15],
  providers: [SlotsRepository, SlotsService],
  controllers: [SlotsController],
  exports: [SlotsService],
})
export class SlotsModule {}
