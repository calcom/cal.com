import { Module } from "@nestjs/common";
import { MeController } from "app/ee/me/me.controller";
import { SchedulesModule_2024_04_15 } from "app/ee/schedules/schedules_2024_04_15/schedules.module";
import { TokensModule } from "app/modules/tokens/tokens.module";
import { UsersModule } from "app/modules/users/users.module";

@Module({
  imports: [UsersModule, SchedulesModule_2024_04_15, TokensModule],
  controllers: [MeController],
})
export class MeModule {}
