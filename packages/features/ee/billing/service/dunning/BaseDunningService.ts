import logger from "@calcom/lib/logger";
import type { DunningStatus } from "@calcom/prisma/client";
import type { IDunningRepository } from "../../repository/dunning/IDunningRepository";
import { type DunningEntityType, toDunningRecord } from "./DunningMapper";
import type { IDunningService, PaymentFailedParams } from "./IDunningService";

const log = logger.getSubLogger({ prefix: ["DunningService"] });

export const SOFT_BLOCK_DAYS = 7;
export const HARD_BLOCK_DAYS = 14;
export const CANCEL_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const DUNNING_TRANSITIONS: Array<{ from: DunningStatus; to: DunningStatus; afterDays: number }> = [
  { from: "HARD_BLOCKED", to: "CANCELLED", afterDays: CANCEL_DAYS },
  { from: "WARNING", to: "HARD_BLOCKED", afterDays: HARD_BLOCK_DAYS },
  { from: "SOFT_BLOCKED", to: "HARD_BLOCKED", afterDays: HARD_BLOCK_DAYS },
  { from: "WARNING", to: "SOFT_BLOCKED", afterDays: SOFT_BLOCK_DAYS },
];

export interface IBaseDunningServiceDeps {
  dunningRepository: IDunningRepository;
}

export class BaseDunningService implements IDunningService {
  constructor(
    protected deps: IBaseDunningServiceDeps,
    protected entityType: DunningEntityType
  ) {}

  async onPaymentFailed(params: PaymentFailedParams): Promise<{ isNewDunningRecord: boolean }> {
    const { billingId, subscriptionId, failedInvoiceId, invoiceUrl, failureReason } = params;
    const now = new Date();

    const raw = await this.deps.dunningRepository.findByBillingId(billingId);
    const existing = raw ? toDunningRecord(raw, this.entityType) : null;

    const isCurrent = existing?.status === "CURRENT";
    const isNewDunningRecord = !existing || isCurrent;
    const status: DunningStatus = existing && !isCurrent ? existing.status : "WARNING";
    const firstFailedAt = existing && !isCurrent ? existing.firstFailedAt : now;

    await this.deps.dunningRepository.upsert(billingId, {
      status,
      firstFailedAt: firstFailedAt ?? undefined,
      lastFailedAt: now,
      resolvedAt: null,
      subscriptionId,
      failedInvoiceId,
      invoiceUrl,
      failureReason,
    });

    log.info(`Payment failed for ${this.entityType} billing ${billingId}, dunning status set to ${status}`);
    return { isNewDunningRecord };
  }

  async onPaymentSucceeded(billingId: string): Promise<void> {
    const raw = await this.deps.dunningRepository.findByBillingId(billingId);
    const existing = raw ? toDunningRecord(raw, this.entityType) : null;

    if (!existing || existing.status === "CURRENT") return;

    const previousStatus = existing.status;

    await this.deps.dunningRepository.upsert(existing.billingId, {
      status: "CURRENT",
      resolvedAt: new Date(),
      failedInvoiceId: null,
      invoiceUrl: null,
    });

    log.info(
      `Payment succeeded for ${this.entityType} billing ${billingId}, recovered from ${previousStatus} to CURRENT`
    );
  }

  async getBillingIdsToAdvance(): Promise<string[]> {
    const raws = await this.deps.dunningRepository.findEntitiesToAdvance();
    return raws.map((r) => r.billingFk);
  }

  async advanceDunning(
    billingId: string
  ): Promise<{ advanced: boolean; from?: DunningStatus; to?: DunningStatus }> {
    const raw = await this.deps.dunningRepository.findByBillingId(billingId);
    const record = raw ? toDunningRecord(raw, this.entityType) : null;

    if (!record || record.status === "CURRENT") return { advanced: false };

    if (!record.firstFailedAt) {
      log.warn(`Skipping ${this.entityType} billing ${billingId}: firstFailedAt is null`);
      return { advanced: false };
    }

    const daysSinceFirstFailure = (Date.now() - record.firstFailedAt.getTime()) / MS_PER_DAY;

    const transition = DUNNING_TRANSITIONS.find(
      (t) => t.from === record.status && daysSinceFirstFailure >= t.afterDays
    );

    if (transition) {
      await this.deps.dunningRepository.advanceStatus(record.billingId, transition.to);
      log.info(
        `Advanced ${this.entityType} billing ${billingId} from ${record.status} to ${transition.to} (${Math.floor(daysSinceFirstFailure)} days since first failure)`
      );
      return { advanced: true, from: record.status, to: transition.to };
    }

    return { advanced: false };
  }

  async getStatus(billingId: string): Promise<DunningStatus> {
    const raw = await this.deps.dunningRepository.findByBillingId(billingId);
    return raw ? raw.status : "CURRENT";
  }
}
