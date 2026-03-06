import { z } from "zod";
import type { DataRequirements } from "../service/EnrichmentDataStore";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type {
  BaseStoredAuditData,
  DisplayField,
  GetDisplayFieldsParams,
  GetDisplayJsonParams,
  GetDisplayTitleParams,
  IAuditActionService,
  TranslationWithParams,
} from "./IAuditActionService";

/**
 * V1: Stored rescheduledRequestedBy as email (PII in payload)
 * V2: PII-free, only stores rescheduleReason (actor already provides "who requested")
 */

const fieldsSchemaV1 = z.object({
  rescheduleReason: z.string().nullable(),
  rescheduledRequestedBy: z.string().nullable(),
});

const fieldsSchemaV2 = z.object({
  rescheduleReason: z.string().nullable(),
});

const latestFieldsSchema = fieldsSchemaV2;

type FieldsSchemaV1 = z.infer<typeof fieldsSchemaV1>;
type FieldsSchemaV2 = z.infer<typeof fieldsSchemaV2>;

class RescheduleRequestedV1 {
  static readonly dataSchema = z.object({
    version: z.literal(1),
    fields: fieldsSchemaV1,
  });

  getDisplayJson(fields: FieldsSchemaV1): RescheduleRequestedAuditDisplayDataV1 {
    return {
      reason: fields.rescheduleReason ?? null,
      requestedBy: fields.rescheduledRequestedBy ?? null,
    };
  }
}

class RescheduleRequestedV2 {
  static readonly dataSchema = z.object({
    version: z.literal(2),
    fields: fieldsSchemaV2,
  });

  getDisplayJson(fields: FieldsSchemaV2): RescheduleRequestedAuditDisplayDataV2 {
    return {
      reason: fields.rescheduleReason ?? null,
    };
  }
}

export class RescheduleRequestedAuditActionService implements IAuditActionService {
  static readonly VERSION = 2;
  public static readonly TYPE = "RESCHEDULE_REQUESTED" as const;

  public static readonly latestFieldsSchema = latestFieldsSchema;
  public static readonly storedDataSchema = z.union([
    RescheduleRequestedV2.dataSchema,
    RescheduleRequestedV1.dataSchema,
  ]);

  private helper: AuditActionServiceHelper<
    typeof latestFieldsSchema,
    typeof RescheduleRequestedAuditActionService.storedDataSchema
  >;

  private v1 = new RescheduleRequestedV1();
  private v2 = new RescheduleRequestedV2();

  constructor() {
    this.helper = new AuditActionServiceHelper({
      latestVersion: RescheduleRequestedAuditActionService.VERSION,
      latestFieldsSchema,
      storedDataSchema: RescheduleRequestedAuditActionService.storedDataSchema,
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
    return {};
  }

  async getDisplayTitle(_: GetDisplayTitleParams): Promise<TranslationWithParams> {
    return { key: "booking_audit_action.reschedule_requested" };
  }

  getDisplayJson({ storedData }: GetDisplayJsonParams): RescheduleRequestedAuditDisplayData {
    const parsed = this.parseStored(storedData);
    if (parsed.version === 1) {
      return this.v1.getDisplayJson(parsed.fields);
    }
    return this.v2.getDisplayJson(parsed.fields);
  }

  async getDisplayFields(_: GetDisplayFieldsParams): Promise<DisplayField[]> {
    return [];
  }
}

export type RescheduleRequestedAuditData = z.infer<typeof fieldsSchemaV2>;

export type RescheduleRequestedAuditDisplayDataV1 = {
  reason: string | null;
  requestedBy: string | null;
};

export type RescheduleRequestedAuditDisplayDataV2 = {
  reason: string | null;
};

export type RescheduleRequestedAuditDisplayData =
  | RescheduleRequestedAuditDisplayDataV1
  | RescheduleRequestedAuditDisplayDataV2;
