import { createModule } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";

import { PrismaAuditRepository } from "../repositories/PrismaAuditRepository";
import { AuditService } from "../services/AuditService";
import { WATCHLIST_DI_TOKENS } from "../tokens";

export const auditServiceModule = createModule();

// Bind audit repository
auditServiceModule
  .bind(WATCHLIST_DI_TOKENS.AUDIT_REPOSITORY)
  .toClass(PrismaAuditRepository, [DI_TOKENS.PRISMA_CLIENT]);

// Bind audit service
auditServiceModule
  .bind(WATCHLIST_DI_TOKENS.AUDIT_SERVICE)
  .toClass(AuditService, [WATCHLIST_DI_TOKENS.AUDIT_REPOSITORY]);
