import { Injectable } from "@nestjs/common";

import { BlockingService as BaseBlockingService } from "@calcom/features/watchlist/services/BlockingService";
import { EmailBlockingStrategy, DomainBlockingStrategy } from "@calcom/features/watchlist/strategies";

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
