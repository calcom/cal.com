import { emailSchema } from "@calcom/lib/emailSchema";
import { z } from "zod";
import type { DataRequirements, EnrichmentDataStore } from "../service/EnrichmentDataStore";
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
 * V1: Stored email addresses of added attendees (PII in payload)
 * V2: Stores attendee IDs (PII-free), enriched via EnrichmentDataStore at display time
 */

const fieldsSchemaV1 = z.object({
  added: z.array(emailSchema),
});

const fieldsSchemaV2 = z.object({
  addedAttendeeIds: z.array(z.number()),
});

const latestFieldsSchema = fieldsSchemaV2;

type FieldsSchemaV1 = z.infer<typeof fieldsSchemaV1>;
type FieldsSchemaV2 = z.infer<typeof fieldsSchemaV2>;

class AttendeeAddedV1 {
  static readonly dataSchema = z.object({
    version: z.literal(1),
    fields: fieldsSchemaV1,
  });

  getDataRequirements(): DataRequirements {
    return { userUuids: [] };
  }

  getDisplayJson(fields: FieldsSchemaV1): AttendeeAddedAuditDisplayDataV1 {
    return { addedAttendees: fields.added };
  }

  getDisplayFields(): Array<DisplayField> {
    return [];
  }
}

class AttendeeAddedV2 {
  static readonly dataSchema = z.object({
    version: z.literal(2),
    fields: fieldsSchemaV2,
  });

  getDataRequirements(fields: FieldsSchemaV2): DataRequirements {
    return { attendeeIds: fields.addedAttendeeIds };
  }

  getDisplayJson(fields: FieldsSchemaV2): AttendeeAddedAuditDisplayDataV2 {
    return { addedAttendeeIds: fields.addedAttendeeIds };
  }

  getDisplayFields(
    fields: FieldsSchemaV2,
    dbStore: EnrichmentDataStore
  ): Array<DisplayField> {
    const attendeeNames = fields.addedAttendeeIds.map((id) => {
      const attendee = dbStore.getAttendeeById(id);
      return attendee?.name || attendee?.email || "Unknown";
    });
    return [{ labelKey: "booking_audit_action.added_attendees", fieldValue: { type: "rawValues", values: attendeeNames } }];
  }
}

export class AttendeeAddedAuditActionService implements IAuditActionService {
  static readonly VERSION = 2;
  public static readonly TYPE = "ATTENDEE_ADDED" as const;

  public static readonly latestFieldsSchema = latestFieldsSchema;
  public static readonly storedDataSchema = z.union([
    AttendeeAddedV2.dataSchema,
    AttendeeAddedV1.dataSchema,
  ]);

  private helper: AuditActionServiceHelper<
    typeof latestFieldsSchema,
    typeof AttendeeAddedAuditActionService.storedDataSchema
  >;

  private v1 = new AttendeeAddedV1();
  private v2 = new AttendeeAddedV2();

  constructor() {
    this.helper = new AuditActionServiceHelper({
      latestVersion: AttendeeAddedAuditActionService.VERSION,
      latestFieldsSchema,
      storedDataSchema: AttendeeAddedAuditActionService.storedDataSchema,
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

  async getDisplayTitle(_: GetDisplayTitleParams): Promise<TranslationWithParams> {
    return { key: "booking_audit_action.attendee_added" };
  }

  getDataRequirements(storedData: BaseStoredAuditData): DataRequirements {
    const parsed = this.parseStored(storedData);
    if (parsed.version === 1) {
      return this.v1.getDataRequirements();
    }
    return this.v2.getDataRequirements(parsed.fields);
  }

  getDisplayJson({ storedData }: GetDisplayJsonParams): AttendeeAddedAuditDisplayData {
    const parsed = this.parseStored(storedData);
    if (parsed.version === 1) {
      return this.v1.getDisplayJson(parsed.fields);
    }
    return this.v2.getDisplayJson(parsed.fields);
  }

  async getDisplayFields({ storedData, dbStore }: GetDisplayFieldsParams): Promise<DisplayField[]> {
    const parsed = this.parseStored(storedData);
    if (parsed.version === 1) {
      return this.v1.getDisplayFields();
    }
    return this.v2.getDisplayFields(parsed.fields, dbStore);
  }
}

export type AttendeeAddedAuditData = FieldsSchemaV2;

export type AttendeeAddedAuditDisplayDataV1 = {
  addedAttendees: string[];
};

export type AttendeeAddedAuditDisplayDataV2 = {
  addedAttendeeIds: number[];
};

export type AttendeeAddedAuditDisplayData = AttendeeAddedAuditDisplayDataV1 | AttendeeAddedAuditDisplayDataV2;
