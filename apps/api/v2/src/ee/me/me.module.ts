import { Module } from "@nestjs/common";

import { TokensModule } from "../../modules/tokens/tokens.module";
import { UsersModule } from "../../modules/users/users.module";
import { SchedulesModule_2024_04_15 } from "../schedules/schedules_2024_04_15/schedules.module";
import { MeController } from "./me.controller";

@Module({
  imports: [UsersModule, SchedulesModule_2024_04_15, TokensModule],
  controllers: [MeController],
})
export class MeModule {}
