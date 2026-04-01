import { Module } from "@nestjs/common";

import { CreditsController } from "@/modules/credits/controllers/credits.controller";
import { CreditsService } from "@/modules/credits/services/credits.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [CreditsService],
  controllers: [CreditsController],
  exports: [CreditsService],
})
export class CreditsModule {}
