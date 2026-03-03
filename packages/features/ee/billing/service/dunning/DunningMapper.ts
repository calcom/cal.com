import type { RawDunningRecordForBilling } from "../../repository/dunning/IDunningRepository";
import type { DunningEntityType, DunningStatus } from "./DunningState";

export interface DunningRecordForBilling {
  billingId: string;
  teamId: number;
  entityType: DunningEntityType;
  status: DunningStatus;
  firstFailedAt: Date | null;
  invoiceUrl: string | null;
  failureReason: string | null;
  entityName: string | null;
  isOrganization: boolean;
}

export function toDunningRecordForBilling(
  raw: RawDunningRecordForBilling,
  entityType: DunningEntityType
): DunningRecordForBilling {
  return {
    billingId: raw.billingFk,
    teamId: raw.teamId,
    entityType,
    status: raw.status,
    firstFailedAt: raw.firstFailedAt,
    invoiceUrl: raw.invoiceUrl,
    failureReason: raw.failureReason,
    entityName: raw.entityName,
    isOrganization: raw.isOrganization,
  };
}
