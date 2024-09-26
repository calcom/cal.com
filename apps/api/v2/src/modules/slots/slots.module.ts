import { EventTypesModule_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/event-types.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { SlotsController } from "@/modules/slots/controllers/slots.controller";
import { SlotsService } from "@/modules/slots/services/slots.service";
import { SlotsRepository } from "@/modules/slots/slots.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, EventTypesModule_2024_04_15],
  providers: [SlotsRepository, SlotsService],
  controllers: [SlotsController],
  exports: [SlotsService],
})
export class SlotsModule {}
