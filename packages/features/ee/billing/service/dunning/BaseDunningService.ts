import logger from "@calcom/lib/logger";

import type { IDunningRepository } from "../../repository/dunning/IDunningRepository";
import { ENTERPRISE_SLUGS } from "../../constants";
import type { DunningRecordForBilling } from "./DunningMapper";
import { toDunningRecordForBilling } from "./DunningMapper";
import type { DunningEntityType, DunningStatus } from "./DunningState";
import { DunningState } from "./DunningState";
import type { DunningBannerRecord, IDunningService, PaymentFailedParams } from "./IDunningService";

export { SOFT_BLOCK_DAYS, HARD_BLOCK_DAYS, CANCEL_DAYS } from "./DunningState";

const log = logger.getSubLogger({ prefix: ["DunningService"] });

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

    const raw = await this.deps.dunningRepository.findByBillingId(billingId);
    const state = raw ? DunningState.fromRecord(raw, this.entityType) : DunningState.initial(billingId, this.entityType);

    const { state: next, isNewDunningRecord } = state.recordPaymentFailure({
      subscriptionId,
      failedInvoiceId,
      invoiceUrl,
      failureReason,
    });

    await this.deps.dunningRepository.upsert(billingId, {
      status: next.status,
      firstFailedAt: next.firstFailedAt ?? undefined,
      lastFailedAt: next.lastFailedAt ?? undefined,
      resolvedAt: next.resolvedAt,
      subscriptionId: next.subscriptionId,
      failedInvoiceId: next.failedInvoiceId,
      invoiceUrl: next.invoiceUrl,
      failureReason: next.failureReason,
    });

    log.info(`Payment failed for ${this.entityType} billing ${billingId}, dunning status set to ${next.status}`);
    return { isNewDunningRecord };
  }

  async onPaymentSucceeded(billingId: string): Promise<void> {
    const raw = await this.deps.dunningRepository.findByBillingId(billingId);
    if (!raw) return;

    const state = DunningState.fromRecord(raw, this.entityType);
    if (!state.isInDunning) return;

    const previousStatus = state.status;
    const next = state.resolve();

    await this.deps.dunningRepository.upsert(billingId, {
      status: next.status,
      resolvedAt: next.resolvedAt,
      failedInvoiceId: next.failedInvoiceId,
      invoiceUrl: next.invoiceUrl,
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
    if (!raw) return { advanced: false };

    const state = DunningState.fromRecord(raw, this.entityType);

    if (!state.firstFailedAt && state.isInDunning) {
      log.warn(`Skipping ${this.entityType} billing ${billingId}: firstFailedAt is null`);
      return { advanced: false };
    }

    const result = state.advance(new Date());
    if (!result) return { advanced: false };

    await this.deps.dunningRepository.advanceStatus(billingId, result.to);
    const daysSinceFirstFailure = state.firstFailedAt
      ? Math.floor((Date.now() - state.firstFailedAt.getTime()) / (24 * 60 * 60 * 1000))
      : 0;
    log.info(
      `Advanced ${this.entityType} billing ${billingId} from ${result.from} to ${result.to} (${daysSinceFirstFailure} days since first failure)`
    );
    return { advanced: true, from: result.from, to: result.to };
  }

  async getStatus(billingId: string): Promise<DunningStatus> {
    const raw = await this.deps.dunningRepository.findByBillingId(billingId);
    return raw ? raw.status : "CURRENT";
  }

  async findRecord(billingId: string): Promise<DunningState | null> {
    const raw = await this.deps.dunningRepository.findByBillingId(billingId);
    return raw ? DunningState.fromRecord(raw, this.entityType) : null;
  }

  async findByBillingIds(billingIds: string[]): Promise<DunningRecordForBilling[]> {
    if (billingIds.length === 0) return [];
    const raws = await this.deps.dunningRepository.findByBillingIds(billingIds);
    return raws.map((r) => toDunningRecordForBilling(r, this.entityType));
  }

  async getBannerData(billingIds: string[]): Promise<DunningBannerRecord[]> {
    const records = await this.findByBillingIds(billingIds);
    return records.map((r) => ({
      teamId: r.teamId,
      teamName: r.entityName ?? "",
      isOrganization: r.isOrganization,
      status: r.status,
      isEnterprise: r.entitySlug ? ENTERPRISE_SLUGS.includes(r.entitySlug) : false,
      invoiceUrl: r.invoiceUrl,
    }));
  }
}
