import { CalendarsRepository } from "@/platform/calendars/calendars.repository";
import { CalendarsCacheService } from "@/platform/calendars/services/calendars-cache.service";
import { CalendarsService } from "@/platform/calendars/services/calendars.service";
import { EventTypesController_2024_06_14 } from "@/platform/event-types/event-types_2024_06_14/controllers/event-types.controller";
import { EventTypesRepository_2024_06_14 } from "@/platform/event-types/event-types_2024_06_14/event-types.repository";
import { EventTypeResponseTransformPipe } from "@/platform/event-types/event-types_2024_06_14/pipes/event-type-response.transformer";
import { EventTypesService_2024_06_14 } from "@/platform/event-types/event-types_2024_06_14/services/event-types.service";
import { InputEventTypesService_2024_06_14 } from "@/platform/event-types/event-types_2024_06_14/services/input-event-types.service";
import { OutputEventTypesService_2024_06_14 } from "@/platform/event-types/event-types_2024_06_14/services/output-event-types.service";
import { SchedulesRepository_2024_06_11 } from "@/platform/schedules/schedules_2024_06_11/schedules.repository";
import { AppsRepository } from "@/modules/apps/apps.repository";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { EventTypeAccessService } from "@/modules/event-types/services/event-type-access.service";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OutputTeamEventTypesResponsePipe } from "@/modules/teams/event-types/pipes/output-team-event-types-response.pipe";
import { OutputTeamEventTypesService } from "@/modules/teams/event-types/services/output-team-event-types.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { SelectedCalendarsModule } from "@/modules/selected-calendars/selected-calendars.module";
import { TeamsEventTypesRepository } from "@/modules/teams/event-types/teams-event-types.repository";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersService } from "@/modules/users/services/users.service";
import { UsersRepository } from "@/modules/users/users.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, MembershipsModule, TokensModule, SelectedCalendarsModule, RedisModule],
  providers: [
    EventTypesRepository_2024_06_14,
    EventTypesService_2024_06_14,
    InputEventTypesService_2024_06_14,
    OutputEventTypesService_2024_06_14,
    EventTypeAccessService,
    TeamsRepository,
    UsersRepository,
    UsersService,
    SchedulesRepository_2024_06_11,
    EventTypeResponseTransformPipe,
    CalendarsService,
    CalendarsCacheService,
    CredentialsRepository,
    AppsRepository,
    CalendarsRepository,
    OutputTeamEventTypesResponsePipe,
    OutputTeamEventTypesService,
    TeamsEventTypesRepository,
  ],
  controllers: [EventTypesController_2024_06_14],
  exports: [
    EventTypesService_2024_06_14,
    EventTypesRepository_2024_06_14,
    InputEventTypesService_2024_06_14,
    OutputEventTypesService_2024_06_14,
    EventTypeAccessService,
  ],
})
export class EventTypesModule_2024_06_14 {}
