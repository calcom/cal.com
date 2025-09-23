import { Injectable } from "@nestjs/common";

import { EmailBlockingStrategy, DomainBlockingStrategy } from "@calcom/features/watchlist/strategies";
import { BlockingService as BaseBlockingService } from "@calcom/lib/di/watchlist/services/BlockingService";

import { WatchlistRepository } from "../repositories/WatchlistRepository";
import { AuditService } from "./AuditService";

@Injectable()
export class BlockingService extends BaseBlockingService {
  constructor(
    private readonly watchlistRepo: WatchlistRepository,
    private readonly auditServiceDep: AuditService
  ) {
    super(
      [new EmailBlockingStrategy(watchlistRepo), new DomainBlockingStrategy(watchlistRepo)],
      auditServiceDep
    );
  }
}
