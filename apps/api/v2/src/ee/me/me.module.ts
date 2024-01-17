import { MeController } from "@/ee/me/me.controller";
import { UsersModule } from "@/modules/users/users.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [UsersModule],
  controllers: [MeController],
})
export class MeModule {}
