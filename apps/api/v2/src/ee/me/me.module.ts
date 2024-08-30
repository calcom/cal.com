import { Module } from "@nestjs/common";
import { MeController } from "src/ee/me/me.controller";
import { SchedulesModule_2024_04_15 } from "src/ee/schedules/schedules_2024_04_15/schedules.module";
import { TokensModule } from "src/modules/tokens/tokens.module";
import { UsersModule } from "src/modules/users/users.module";

@Module({
  imports: [UsersModule, SchedulesModule_2024_04_15, TokensModule],
  controllers: [MeController],
})
export class MeModule {}
