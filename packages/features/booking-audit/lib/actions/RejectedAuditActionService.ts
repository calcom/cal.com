import type { BookingStatus } from "@calcom/prisma/enums";
import { z } from "zod";
import { BookingStatusChangeSchema } from "../common/changeSchemas";
import type { DataRequirements } from "../service/EnrichmentDataStore";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type {
  BaseStoredAuditData,
  GetDisplayJsonParams,
  GetDisplayTitleParams,
  IAuditActionService,
  TranslationWithParams,
} from "./IAuditActionService";

/**
 * Rejected Audit Action Service
 * Handles REJECTED action with per-action versioning
 */

// Module-level because it is passed to IAuditActionService type outside the class scope
const fieldsSchemaV1 = z.object({
  rejectionReason: z.string().nullable(),
  status: BookingStatusChangeSchema,
});

const latestFieldsSchema = fieldsSchemaV1;

export class RejectedAuditActionService implements IAuditActionService {
  static readonly VERSION = 1;
  public static readonly TYPE = "REJECTED" as const;
  private static dataSchemaV1 = z.object({
    version: z.literal(1),
    fields: fieldsSchemaV1,
  });
  private static fieldsSchemaV1 = fieldsSchemaV1;
  public static readonly latestFieldsSchema = latestFieldsSchema;
  // Union of all versions
  public static readonly storedDataSchema = RejectedAuditActionService.dataSchemaV1;
  // Union of all versions
  public static readonly storedFieldsSchema = RejectedAuditActionService.fieldsSchemaV1;
  private helper: AuditActionServiceHelper<
    typeof latestFieldsSchema,
    typeof RejectedAuditActionService.storedDataSchema
  >;

  constructor() {
    this.helper = new AuditActionServiceHelper({
      latestVersion: RejectedAuditActionService.VERSION,
      latestFieldsSchema,
      storedDataSchema: RejectedAuditActionService.storedDataSchema,
    });
  }

  getVersionedData(fields: unknown) {
    return this.helper.getVersionedData(fields);
  }

  parseStored(data: unknown) {
    return this.helper.parseStored(data);
  }

  getVersion(data: unknown): number {
    return this.helper.getVersion(data);
  }

  parse(data: unknown) {
    return this.helper.parse(data);
  }

  getDataRequirements(): DataRequirements {
    return { userUuids: [] };
  }

  async getDisplayTitle(_: GetDisplayTitleParams): Promise<TranslationWithParams> {
    return { key: "booking_audit_action.rejected" };
  }

  getDisplayJson({ storedData }: GetDisplayJsonParams): RejectedAuditDisplayData {
    const { fields } = this.parseStored(storedData);
    return {
      rejectionReason: fields.rejectionReason ?? null,
      previousStatus: fields.status.old ?? null,
      newStatus: fields.status.new ?? null,
    };
  }
}

export type RejectedAuditData = z.infer<typeof fieldsSchemaV1>;

export type RejectedAuditDisplayData = {
  rejectionReason: string | null;
  previousStatus: BookingStatus | null;
  newStatus: BookingStatus | null;
};
