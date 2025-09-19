import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module } from "@nestjs/common";

import { WatchlistRepository } from "../../lib/repositories/WatchlistRepository";
import { AuditService } from "../../lib/services/AuditService";
import { BlockingService } from "../../lib/services/BlockingService";

@Module({
  imports: [PrismaModule],
  providers: [WatchlistRepository, BlockingService, AuditService],
  exports: [BlockingService, WatchlistRepository],
})
export class WatchlistModule {}
