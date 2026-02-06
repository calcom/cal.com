import { z } from "zod";

import { BookingStatusChangeSchema } from "../common/changeSchemas";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type {
  IAuditActionService,
  TranslationWithParams,
  GetDisplayTitleParams,
  GetDisplayJsonParams,
} from "./IAuditActionService";
import type { BookingStatus } from "@calcom/prisma/enums";

/**
 * Rejected Audit Action Service
 * Handles REJECTED action with per-action versioning
 */

// Module-level because it is passed to IAuditActionService type outside the class scope
const fieldsSchemaV1 = z.object({
  rejectionReason: z.string().nullable(),
  status: BookingStatusChangeSchema,
});

export class RejectedAuditActionService implements IAuditActionService {
  readonly VERSION = 1;
  public static readonly TYPE = "REJECTED" as const;
  private static dataSchemaV1 = z.object({
    version: z.literal(1),
    fields: fieldsSchemaV1,
  });
  private static fieldsSchemaV1 = fieldsSchemaV1;
  public static readonly latestFieldsSchema = fieldsSchemaV1;
  // Union of all versions
  public static readonly storedDataSchema = RejectedAuditActionService.dataSchemaV1;
  // Union of all versions
  public static readonly storedFieldsSchema = RejectedAuditActionService.fieldsSchemaV1;
  private helper: AuditActionServiceHelper<
    typeof RejectedAuditActionService.latestFieldsSchema,
    typeof RejectedAuditActionService.storedDataSchema
  >;

  constructor() {
    this.helper = new AuditActionServiceHelper({
      latestVersion: this.VERSION,
      latestFieldsSchema: RejectedAuditActionService.latestFieldsSchema,
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

  migrateToLatest(data: unknown) {
    // V1-only: validate and return as-is (no migration needed)
    const validated = fieldsSchemaV1.parse(data);
    return { isMigrated: false, latestData: validated };
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
