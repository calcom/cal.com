import { Module } from "@nestjs/common";

import { PrismaModule } from "../../../modules/prisma/prisma.module";
import { TokensModule } from "../../../modules/tokens/tokens.module";
import { UsersModule } from "../../../modules/users/users.module";
import { SchedulesController_2024_06_11 } from "./controllers/schedules.controller";
import { SchedulesRepository_2024_06_11 } from "./schedules.repository";
import { InputSchedulesService_2024_06_11 } from "./services/input-schedules.service";
import { OutputSchedulesService_2024_06_11 } from "./services/output-schedules.service";
import { SchedulesService_2024_06_11 } from "./services/schedules.service";

@Module({
  imports: [PrismaModule, UsersModule, TokensModule],
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
