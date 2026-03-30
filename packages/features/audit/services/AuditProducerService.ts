import { createHmac } from "node:crypto";

import type { IAuditActorRepository } from "@calcom/features/booking-audit/lib/repository/IAuditActorRepository";
import type { ISimpleLogger } from "@calcom/features/di/shared/services/logger.service";

import type { IAuditEventRepository } from "../repositories/IAuditEventRepository";
import type { AuditActor } from "../types/actor";
import type { AuditAction } from "../types/auditAction";
import {
  getCategoryForAction,
  getVisibilityForAction,
  getSensitivityForAction,
} from "../lib/auditActionUtils";
import type { AuditResult, AuditRetentionTier } from "../types/auditClassification";
import type { ValidAuditSource } from "../types/auditSource";
import type { AuditTargetType } from "../types/auditTarget";

type TargetFields =
  | { targetType: AuditTargetType; targetId: string }
  | { targetType?: null; targetId?: null };

type AuditEmitInput = {
  actor: AuditActor;
  action: AuditAction;
  result?: AuditResult;
  source: ValidAuditSource;
  previousValue?: string | null;
  newValue?: string | null;
  orgId: number | null;
  ip?: string | null;
  userAgent?: string | null;
  traceId?: string | null;
  impersonatedBy?: string | null;
  operationId?: string;
  retentionTier?: AuditRetentionTier;
} & TargetFields;

interface AuditProducerServiceDeps {
  auditEventRepository: IAuditEventRepository;
  auditActorRepository: IAuditActorRepository;
  log: ISimpleLogger;
}

class AuditProducerService {
  private readonly hmacSecret: string | undefined;

  constructor(private readonly deps: AuditProducerServiceDeps) {
    // biome-ignore lint/style/noProcessEnv: env var read once at construction
    this.hmacSecret = process.env.AUDIT_HMAC_SECRET;
  }

  async emit(input: AuditEmitInput): Promise<void> {
    try {
      const { actor, action, source, orgId } = input;

      const actorId = await this.resolveActorId(actor);
      const ipHash = this.resolveIpHash(input.ip);
      const operationId = input.operationId ?? crypto.randomUUID();

      const data = {
        actorId,
        action,
        result: input.result ?? ("SUCCESS" as const),
        category: getCategoryForAction(action),
        source,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        previousValue: input.previousValue ?? null,
        newValue: input.newValue ?? null,
        operationId,
        orgId,
        ipHash,
        userAgent: input.userAgent ?? null,
        traceId: input.traceId ?? null,
        impersonatedBy: input.impersonatedBy ?? null,
        visibility: getVisibilityForAction(action),
        sensitivityLevel: getSensitivityForAction(action),
        retentionTier: input.retentionTier ?? ("STANDARD" as const),
      };

      await this.deps.auditEventRepository.create(data);
    } catch (error) {
      this.deps.log.error("Audit emit failed", { action: input.action, error });
    }
  }

  private async resolveActorId(actor: AuditActor): Promise<string> {
    if ("actorId" in actor) return actor.actorId;
    const userActor = await this.deps.auditActorRepository.createIfNotExistsUserActor({
      userUuid: actor.userUuid,
    });
    return userActor.id;
  }

  private resolveIpHash(ip: string | null | undefined): string | null {
    if (!ip) {
      return null;
    }
    if (!this.hmacSecret) {
      this.deps.log.warn("AUDIT_HMAC_SECRET not set, IP will not be hashed");
      return null;
    }
    return createHmac("sha256", this.hmacSecret).update(ip).digest("hex");
  }
}

export { AuditProducerService };
export type { AuditEmitInput };
