import { MeController } from "@/ee/me/me.controller";
import { Module } from "@nestjs/common";

@Module({
  controllers: [MeController],
})
export class MeModule {}
