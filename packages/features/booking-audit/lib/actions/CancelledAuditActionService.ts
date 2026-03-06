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
 * V1: Stored cancelledBy as email string (PII in payload)
 * V2: Removes cancelledBy entirely — read from Booking model at consumption time
 */

const fieldsSchemaV1 = z.object({
  cancellationReason: z.string().nullable(),
  cancelledBy: z.string().nullable(),
  status: BookingStatusChangeSchema,
});

const fieldsSchemaV2 = z.object({
  cancellationReason: z.string().nullable(),
  status: BookingStatusChangeSchema,
});

const latestFieldsSchema = fieldsSchemaV2;

type FieldsSchemaV1 = z.infer<typeof fieldsSchemaV1>;
type FieldsSchemaV2 = z.infer<typeof fieldsSchemaV2>;

class CancelledV1 {
  static readonly dataSchema = z.object({
    version: z.literal(1),
    fields: fieldsSchemaV1,
  });

  getDisplayJson(fields: FieldsSchemaV1): CancelledAuditDisplayDataV1 {
    return {
      cancellationReason: fields.cancellationReason ?? null,
      cancelledBy: fields.cancelledBy ?? null,
      previousStatus: fields.status.old ?? null,
      newStatus: fields.status.new ?? null,
    };
  }
}

class CancelledV2 {
  static readonly dataSchema = z.object({
    version: z.literal(2),
    fields: fieldsSchemaV2,
  });

  getDisplayJson(fields: FieldsSchemaV2): CancelledAuditDisplayDataV2 {
    return {
      cancellationReason: fields.cancellationReason ?? null,
      previousStatus: fields.status.old ?? null,
      newStatus: fields.status.new ?? null,
    };
  }
}

export class CancelledAuditActionService implements IAuditActionService {
  static readonly VERSION = 2;
  public static readonly TYPE = "CANCELLED" as const;

  public static readonly latestFieldsSchema = latestFieldsSchema;
  public static readonly storedDataSchema = z.union([
    CancelledV2.dataSchema,
    CancelledV1.dataSchema,
  ]);

  private helper: AuditActionServiceHelper<
    typeof latestFieldsSchema,
    typeof CancelledAuditActionService.storedDataSchema
  >;

  private v1 = new CancelledV1();
  private v2 = new CancelledV2();

  constructor() {
    this.helper = new AuditActionServiceHelper({
      latestVersion: CancelledAuditActionService.VERSION,
      latestFieldsSchema,
      storedDataSchema: CancelledAuditActionService.storedDataSchema,
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

  getDataRequirements(_storedData: BaseStoredAuditData): DataRequirements {
    return { userUuids: [] };
  }

  async getDisplayTitle(_: GetDisplayTitleParams): Promise<TranslationWithParams> {
    return { key: "booking_audit_action.cancelled" };
  }

  getDisplayJson({ storedData }: GetDisplayJsonParams): CancelledAuditDisplayData {
    const parsed = this.parseStored(storedData);
    if (parsed.version === 1) {
      return this.v1.getDisplayJson(parsed.fields);
    }
    return this.v2.getDisplayJson(parsed.fields);
  }
}

export type CancelledAuditData = z.infer<typeof fieldsSchemaV2>;

export type CancelledAuditDisplayDataV1 = {
  cancellationReason: string | null;
  cancelledBy: string | null;
  previousStatus: string | null;
  newStatus: string | null;
};

export type CancelledAuditDisplayDataV2 = {
  cancellationReason: string | null;
  previousStatus: string | null;
  newStatus: string | null;
};

export type CancelledAuditDisplayData = CancelledAuditDisplayDataV1 | CancelledAuditDisplayDataV2;
