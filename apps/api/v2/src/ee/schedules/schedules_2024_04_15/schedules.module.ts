import { Module } from "@nestjs/common";

import { PrismaModule } from "../../../modules/prisma/prisma.module";
import { TokensModule } from "../../../modules/tokens/tokens.module";
import { UsersModule } from "../../../modules/users/users.module";
import { SchedulesController_2024_04_15 } from "./controllers/schedules.controller";
import { SchedulesRepository_2024_04_15 } from "./schedules.repository";
import { SchedulesService_2024_04_15 } from "./services/schedules.service";

@Module({
  imports: [PrismaModule, UsersModule, TokensModule],
  providers: [SchedulesRepository_2024_04_15, SchedulesService_2024_04_15],
  controllers: [SchedulesController_2024_04_15],
  exports: [SchedulesService_2024_04_15, SchedulesRepository_2024_04_15],
})
export class SchedulesModule_2024_04_15 {}
