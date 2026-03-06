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
 * SEAT_BOOKED captures initial state, so it doesn't use { old, new } pattern
 *
 * V1: Stored attendeeEmail + attendeeName (PII in payload)
 * V2: Stores attendeeId only (PII-free), enriched via EnrichmentDataStore at display time
 */

const fieldsSchemaV1 = z.object({
  seatReferenceUid: z.string(),
  attendeeEmail: z.string(),
  attendeeName: z.string(),
  startTime: z.number(),
  endTime: z.number(),
});

const fieldsSchemaV2 = z.object({
  seatReferenceUid: z.string(),
  attendeeId: z.number(),
  startTime: z.number(),
  endTime: z.number(),
});

const latestFieldsSchema = fieldsSchemaV2;

type FieldsSchemaV1 = z.infer<typeof fieldsSchemaV1>;
type FieldsSchemaV2 = z.infer<typeof fieldsSchemaV2>;

class SeatBookedV1 {
  static readonly dataSchema = z.object({
    version: z.literal(1),
    fields: fieldsSchemaV1,
  });

  getDataRequirements(): DataRequirements {
    return { userUuids: [] };
  }

  getDisplayJson(fields: FieldsSchemaV1, userTimeZone: string): SeatBookedAuditDisplayDataV1 {
    return {
      seatReferenceUid: fields.seatReferenceUid,
      attendeeEmail: fields.attendeeEmail,
      attendeeName: fields.attendeeName,
      startTime: AuditActionServiceHelper.formatDateTimeInTimeZone(fields.startTime, userTimeZone),
      endTime: AuditActionServiceHelper.formatDateTimeInTimeZone(fields.endTime, userTimeZone),
    };
  }

  getDisplayFields(): Array<DisplayField> {
    return [];
  }
}

class SeatBookedV2 {
  static readonly dataSchema = z.object({
    version: z.literal(2),
    fields: fieldsSchemaV2,
  });

  getDataRequirements(fields: FieldsSchemaV2): DataRequirements {
    return { attendeeIds: [fields.attendeeId] };
  }

  getDisplayJson(fields: FieldsSchemaV2, userTimeZone: string): SeatBookedAuditDisplayDataV2 {
    return {
      seatReferenceUid: fields.seatReferenceUid,
      attendeeId: fields.attendeeId,
      startTime: AuditActionServiceHelper.formatDateTimeInTimeZone(fields.startTime, userTimeZone),
      endTime: AuditActionServiceHelper.formatDateTimeInTimeZone(fields.endTime, userTimeZone),
    };
  }

  getDisplayFields(
    fields: FieldsSchemaV2,
    dbStore: EnrichmentDataStore
  ): Array<DisplayField> {
    const attendee = dbStore.getAttendeeById(fields.attendeeId);
    return [
      {
        labelKey: "booking_audit_action.attendee",
        fieldValue: { type: "rawValue", value: attendee?.name ?? attendee?.email ?? "Unknown" },
      },
    ];
  }
}

export class SeatBookedAuditActionService implements IAuditActionService {
  static readonly VERSION = 2;
  public static readonly TYPE = "SEAT_BOOKED" as const;

  public static readonly latestFieldsSchema = latestFieldsSchema;
  public static readonly storedDataSchema = z.union([
    SeatBookedV2.dataSchema,
    SeatBookedV1.dataSchema,
  ]);

  private helper: AuditActionServiceHelper<
    typeof latestFieldsSchema,
    typeof SeatBookedAuditActionService.storedDataSchema
  >;

  private v1 = new SeatBookedV1();
  private v2 = new SeatBookedV2();

  constructor() {
    this.helper = new AuditActionServiceHelper({
      latestVersion: SeatBookedAuditActionService.VERSION,
      latestFieldsSchema,
      storedDataSchema: SeatBookedAuditActionService.storedDataSchema,
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
    return { key: "booking_audit_action.seat_booked" };
  }

  getDataRequirements(storedData: BaseStoredAuditData): DataRequirements {
    const parsed = this.parseStored(storedData);
    if (parsed.version === 1) {
      return this.v1.getDataRequirements();
    }
    return this.v2.getDataRequirements(parsed.fields);
  }

  getDisplayJson({ storedData, userTimeZone }: GetDisplayJsonParams): SeatBookedAuditDisplayData {
    const parsed = this.parseStored(storedData);
    if (parsed.version === 1) {
      return this.v1.getDisplayJson(parsed.fields, userTimeZone);
    }
    return this.v2.getDisplayJson(parsed.fields, userTimeZone);
  }

  async getDisplayFields({ storedData, dbStore }: GetDisplayFieldsParams): Promise<DisplayField[]> {
    const parsed = this.parseStored(storedData);
    if (parsed.version === 1) {
      return this.v1.getDisplayFields();
    }
    return this.v2.getDisplayFields(parsed.fields, dbStore);
  }
}

export type SeatBookedAuditData = z.infer<typeof fieldsSchemaV2>;

export type SeatBookedAuditDisplayDataV1 = {
  seatReferenceUid: string;
  attendeeEmail: string;
  attendeeName: string;
  startTime: string;
  endTime: string;
};

export type SeatBookedAuditDisplayDataV2 = {
  seatReferenceUid: string;
  attendeeId: number;
  startTime: string;
  endTime: string;
};

export type SeatBookedAuditDisplayData =
  | SeatBookedAuditDisplayDataV1
  | SeatBookedAuditDisplayDataV2;
