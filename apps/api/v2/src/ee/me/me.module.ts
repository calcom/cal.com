import { MeController } from "@/ee/me/me.controller";
import { SchedulesModule } from "@/ee/schedules/schedules.module";
import { UsersModule } from "@/modules/users/users.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [UsersModule, SchedulesModule],
  controllers: [MeController],
})
export class MeModule {}
