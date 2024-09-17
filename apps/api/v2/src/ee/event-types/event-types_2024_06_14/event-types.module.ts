import { Module } from "@nestjs/common";

import { MembershipsModule } from "../../../modules/memberships/memberships.module";
import { PrismaModule } from "../../../modules/prisma/prisma.module";
import { SelectedCalendarsModule } from "../../../modules/selected-calendars/selected-calendars.module";
import { TokensModule } from "../../../modules/tokens/tokens.module";
import { UsersService } from "../../../modules/users/services/users.service";
import { UsersRepository } from "../../../modules/users/users.repository";
import { SchedulesRepository_2024_06_11 } from "../../schedules/schedules_2024_06_11/schedules.repository";
import { EventTypesController_2024_06_14 } from "./controllers/event-types.controller";
import { EventTypesRepository_2024_06_14 } from "./event-types.repository";
import { EventTypesService_2024_06_14 } from "./services/event-types.service";
import { InputEventTypesService_2024_06_14 } from "./services/input-event-types.service";
import { OutputEventTypesService_2024_06_14 } from "./services/output-event-types.service";

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
