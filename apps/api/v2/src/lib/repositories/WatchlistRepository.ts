import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import { PrismaWatchlistReadRepository } from "@calcom/features/watchlist/repositories/PrismaWatchlistReadRepository";
import { PrismaWatchlistRepository } from "@calcom/features/watchlist/repositories/PrismaWatchlistRepository";
import { PrismaWatchlistWriteRepository } from "@calcom/features/watchlist/repositories/PrismaWatchlistWriteRepository";
import { PrismaClient } from "@calcom/prisma";

@Injectable()
export class WatchlistRepository extends PrismaWatchlistRepository {
  constructor(private readonly dbWrite: PrismaWriteService) {
    super(
      new PrismaWatchlistReadRepository(dbWrite.prisma as unknown as PrismaClient),
      new PrismaWatchlistWriteRepository(dbWrite.prisma as unknown as PrismaClient)
    );
  }
}
