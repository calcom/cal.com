import { EventTypesController } from "@/ee/event-types/controllers/event-types.controller";
import { EventTypesRepository } from "@/ee/event-types/event-types.repository";
import { EventTypesService } from "@/ee/event-types/services/event-types.service";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, MembershipsModule],
  providers: [EventTypesRepository, EventTypesService],
  controllers: [EventTypesController],
  exports: [EventTypesService, EventTypesRepository],
})
export class EventTypesModule {}
