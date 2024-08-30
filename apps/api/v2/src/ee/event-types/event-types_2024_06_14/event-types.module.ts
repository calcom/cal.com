import { Module } from "@nestjs/common";
import { EventTypesController_2024_06_14 } from "src/ee/event-types/event-types_2024_06_14/controllers/event-types.controller";
import { EventTypesRepository_2024_06_14 } from "src/ee/event-types/event-types_2024_06_14/event-types.repository";
import { EventTypesService_2024_06_14 } from "src/ee/event-types/event-types_2024_06_14/services/event-types.service";
import { InputEventTypesService_2024_06_14 } from "src/ee/event-types/event-types_2024_06_14/services/input-event-types.service";
import { OutputEventTypesService_2024_06_14 } from "src/ee/event-types/event-types_2024_06_14/services/output-event-types.service";
import { SchedulesRepository_2024_06_11 } from "src/ee/schedules/schedules_2024_06_11/schedules.repository";
import { MembershipsModule } from "src/modules/memberships/memberships.module";
import { PrismaModule } from "src/modules/prisma/prisma.module";
import { SelectedCalendarsModule } from "src/modules/selected-calendars/selected-calendars.module";
import { TokensModule } from "src/modules/tokens/tokens.module";
import { UsersService } from "src/modules/users/services/users.service";
import { UsersRepository } from "src/modules/users/users.repository";

@Module({
  imports: [PrismaModule, MembershipsModule, TokensModule, SelectedCalendarsModule],
  providers: [
    EventTypesRepository_2024_06_14,
    EventTypesService_2024_06_14,
    InputEventTypesService_2024_06_14,
    OutputEventTypesService_2024_06_14,
    UsersRepository,
    UsersService,
    SchedulesRepository_2024_06_11,
  ],
  controllers: [EventTypesController_2024_06_14],
  exports: [
    EventTypesService_2024_06_14,
    EventTypesRepository_2024_06_14,
    InputEventTypesService_2024_06_14,
    OutputEventTypesService_2024_06_14,
  ],
})
export class EventTypesModule_2024_06_14 {}
