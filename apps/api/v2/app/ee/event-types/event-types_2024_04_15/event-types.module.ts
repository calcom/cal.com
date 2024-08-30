import { Module } from "@nestjs/common";
import { EventTypesController_2024_04_15 } from "app/ee/event-types/event-types_2024_04_15/controllers/event-types.controller";
import { EventTypesRepository_2024_04_15 } from "app/ee/event-types/event-types_2024_04_15/event-types.repository";
import { EventTypesService_2024_04_15 } from "app/ee/event-types/event-types_2024_04_15/services/event-types.service";
import { MembershipsModule } from "app/modules/memberships/memberships.module";
import { PrismaModule } from "app/modules/prisma/prisma.module";
import { SelectedCalendarsModule } from "app/modules/selected-calendars/selected-calendars.module";
import { TokensModule } from "app/modules/tokens/tokens.module";
import { UsersModule } from "app/modules/users/users.module";

@Module({
  imports: [PrismaModule, MembershipsModule, TokensModule, UsersModule, SelectedCalendarsModule],
  providers: [EventTypesRepository_2024_04_15, EventTypesService_2024_04_15],
  controllers: [EventTypesController_2024_04_15],
  exports: [EventTypesService_2024_04_15, EventTypesRepository_2024_04_15],
})
export class EventTypesModule_2024_04_15 {}
