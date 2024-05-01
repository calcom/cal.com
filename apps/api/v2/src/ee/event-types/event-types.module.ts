import { EventTypesController } from "@/ee/event-types/controllers/event-types.controller";
import { EventTypesRepository } from "@/ee/event-types/event-types.repository";
import { EventTypesService } from "@/ee/event-types/services/event-types.service";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { SelectedCalendarsModule } from "@/modules/selected-calendars/selected-calendars.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, MembershipsModule, TokensModule, UsersModule, SelectedCalendarsModule],
  providers: [EventTypesRepository, EventTypesService],
  controllers: [EventTypesController],
  exports: [EventTypesService, EventTypesRepository],
})
export class EventTypesModule {}
