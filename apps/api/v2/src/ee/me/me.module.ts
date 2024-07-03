import { MeController } from "@/ee/me/me.controller";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [UsersModule, SchedulesModule_2024_04_15, TokensModule],
  controllers: [MeController],
})
export class MeModule {}
