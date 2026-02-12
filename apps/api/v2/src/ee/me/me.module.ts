import { MeController } from "@/ee/me/me.controller";
import { MeService } from "@/ee/me/services/me.service";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { PrismaFeaturesRepository } from "@/lib/repositories/prisma-features.repository";
import { PrismaWorkerModule } from "@/modules/prisma/prisma-worker.module";
import { OAuthClientModule } from "@/modules/oauth-clients/oauth-client.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaWorkerModule, UsersModule, SchedulesModule_2024_04_15, TokensModule, OAuthClientModule],
  providers: [PrismaFeaturesRepository, MeService],
  controllers: [MeController],
})
export class MeModule {}
