import { EventTypesController_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/controllers/event-types.controller";
import { EventTypesRepository_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/event-types.repository";
import { EventTypesService_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/services/event-types.service";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { SelectedCalendarsModule } from "@/modules/selected-calendars/selected-calendars.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, MembershipsModule, TokensModule, UsersModule, SelectedCalendarsModule],
  providers: [EventTypesRepository_2024_04_15, EventTypesService_2024_04_15],
  controllers: [EventTypesController_2024_04_15],
  exports: [EventTypesService_2024_04_15, EventTypesRepository_2024_04_15],
})
export class EventTypesModule_2024_04_15 {}
