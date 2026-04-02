import { Module } from "@nestjs/common";
import { EventTypesModule_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.module";
import { SchedulesController_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/controllers/schedules.controller";
import { SchedulesRepository_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/schedules.repository";
import { InputSchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/input-schedules.service";
import { OutputSchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/output-schedules.service";
import { SchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/schedules.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";

@Module({
  imports: [PrismaModule, UsersModule, TokensModule, EventTypesModule_2024_06_14],
  providers: [
    SchedulesRepository_2024_06_11,
    SchedulesService_2024_06_11,
    InputSchedulesService_2024_06_11,
    OutputSchedulesService_2024_06_11,
  ],
  controllers: [SchedulesController_2024_06_11],
  exports: [SchedulesService_2024_06_11, SchedulesRepository_2024_06_11, OutputSchedulesService_2024_06_11],
})
export class SchedulesModule_2024_06_11 {}
