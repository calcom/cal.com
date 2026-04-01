import {
  getOrgDunningRepository,
  getTeamDunningRepository,
} from "@calcom/features/ee/billing/di/containers/Billing";

import type { TrpcSessionUser } from "../../../types";
import type { TUpsertDunningInput } from "./upsertDunning.schema";

type UpsertDunningOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpsertDunningInput;
};

export const upsertDunningHandler = async ({ input }: UpsertDunningOptions) => {
  const { billingId, entityType, status, invoiceUrl } = input;

  const repository =
    entityType === "organization" ? getOrgDunningRepository() : getTeamDunningRepository();

  const existing = await repository.findByBillingId(billingId);
  const now = new Date();

  const record = await repository.upsert(billingId, {
    status,
    invoiceUrl: invoiceUrl ?? null,
    firstFailedAt: existing?.firstFailedAt ?? (status !== "CURRENT" ? now : undefined),
    lastFailedAt: status !== "CURRENT" ? now : undefined,
    resolvedAt: status === "CURRENT" ? now : null,
  });

  return {
    success: true,
    id: record.id,
    previousStatus: existing?.status ?? null,
    newStatus: record.status,
    message: existing
      ? `Dunning updated: ${existing.status} → ${record.status}`
      : `Dunning record created with status ${record.status}`,
  };
};

export default upsertDunningHandler;
