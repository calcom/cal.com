import { Module } from "@nestjs/common";
import { SchedulesController_2024_04_15 } from "src/ee/schedules/schedules_2024_04_15/controllers/schedules.controller";
import { SchedulesRepository_2024_04_15 } from "src/ee/schedules/schedules_2024_04_15/schedules.repository";
import { SchedulesService_2024_04_15 } from "src/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { PrismaModule } from "src/modules/prisma/prisma.module";
import { TokensModule } from "src/modules/tokens/tokens.module";
import { UsersModule } from "src/modules/users/users.module";

@Module({
  imports: [PrismaModule, UsersModule, TokensModule],
  providers: [SchedulesRepository_2024_04_15, SchedulesService_2024_04_15],
  controllers: [SchedulesController_2024_04_15],
  exports: [SchedulesService_2024_04_15, SchedulesRepository_2024_04_15],
})
export class SchedulesModule_2024_04_15 {}
