import { Module } from "@nestjs/common";
import { MeController } from "@/ee/me/me.controller";
import { MeService } from "@/ee/me/services/me.service";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { PrismaFeaturesRepository } from "@/lib/repositories/prisma-features.repository";
import { OAuthClientModule } from "@/modules/oauth-clients/oauth-client.module";
import { PrismaWorkerModule } from "@/modules/prisma/prisma-worker.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";

@Module({
  imports: [PrismaWorkerModule, UsersModule, SchedulesModule_2024_04_15, TokensModule, OAuthClientModule],
  providers: [PrismaFeaturesRepository, MeService],
  controllers: [MeController],
})
export class MeModule {}
