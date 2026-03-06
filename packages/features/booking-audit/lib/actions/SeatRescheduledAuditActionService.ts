import { z } from "zod";
import { NumberChangeSchema, StringChangeSchema } from "../common/changeSchemas";
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
 * V1: Stored attendeeEmail (PII in payload)
 * V2: Stores attendeeId only (PII-free), enriched via EnrichmentDataStore at display time
 */

const fieldsSchemaV1 = z.object({
  seatReferenceUid: z.string(),
  attendeeEmail: z.string(),
  startTime: NumberChangeSchema,
  endTime: NumberChangeSchema,
  rescheduledToBookingUid: StringChangeSchema,
});

const fieldsSchemaV2 = z.object({
  seatReferenceUid: z.string(),
  attendeeId: z.number(),
  startTime: NumberChangeSchema,
  endTime: NumberChangeSchema,
  rescheduledToBookingUid: StringChangeSchema,
});

const latestFieldsSchema = fieldsSchemaV2;

type FieldsSchemaV1 = z.infer<typeof fieldsSchemaV1>;
type FieldsSchemaV2 = z.infer<typeof fieldsSchemaV2>;

class SeatRescheduledV1 {
  static readonly dataSchema = z.object({
    version: z.literal(1),
    fields: fieldsSchemaV1,
  });

  getDataRequirements(): DataRequirements {
    return { userUuids: [] };
  }

  getDisplayJson(fields: FieldsSchemaV1, userTimeZone: string): SeatRescheduledAuditDisplayDataV1 {
    return {
      seatReferenceUid: fields.seatReferenceUid,
      attendeeEmail: fields.attendeeEmail,
      previousStartTime: fields.startTime.old
        ? AuditActionServiceHelper.formatDateTimeInTimeZone(fields.startTime.old, userTimeZone)
        : null,
      newStartTime: fields.startTime.new
        ? AuditActionServiceHelper.formatDateTimeInTimeZone(fields.startTime.new, userTimeZone)
        : null,
      previousEndTime: fields.endTime.old
        ? AuditActionServiceHelper.formatDateTimeInTimeZone(fields.endTime.old, userTimeZone)
        : null,
      newEndTime: fields.endTime.new
        ? AuditActionServiceHelper.formatDateTimeInTimeZone(fields.endTime.new, userTimeZone)
        : null,
      rescheduledToBookingUid: fields.rescheduledToBookingUid.new ?? null,
    };
  }

  getDisplayFields(): Array<DisplayField> {
    return [];
  }
}

class SeatRescheduledV2 {
  static readonly dataSchema = z.object({
    version: z.literal(2),
    fields: fieldsSchemaV2,
  });

  getDataRequirements(fields: FieldsSchemaV2): DataRequirements {
    return { attendeeIds: [fields.attendeeId] };
  }

  getDisplayJson(fields: FieldsSchemaV2, userTimeZone: string): SeatRescheduledAuditDisplayDataV2 {
    return {
      seatReferenceUid: fields.seatReferenceUid,
      attendeeId: fields.attendeeId,
      previousStartTime: fields.startTime.old
        ? AuditActionServiceHelper.formatDateTimeInTimeZone(fields.startTime.old, userTimeZone)
        : null,
      newStartTime: fields.startTime.new
        ? AuditActionServiceHelper.formatDateTimeInTimeZone(fields.startTime.new, userTimeZone)
        : null,
      previousEndTime: fields.endTime.old
        ? AuditActionServiceHelper.formatDateTimeInTimeZone(fields.endTime.old, userTimeZone)
        : null,
      newEndTime: fields.endTime.new
        ? AuditActionServiceHelper.formatDateTimeInTimeZone(fields.endTime.new, userTimeZone)
        : null,
      rescheduledToBookingUid: fields.rescheduledToBookingUid.new ?? null,
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

export class SeatRescheduledAuditActionService implements IAuditActionService {
  static readonly VERSION = 2;
  public static readonly TYPE = "SEAT_RESCHEDULED" as const;

  public static readonly latestFieldsSchema = latestFieldsSchema;
  public static readonly storedDataSchema = z.union([
    SeatRescheduledV2.dataSchema,
    SeatRescheduledV1.dataSchema,
  ]);

  private helper: AuditActionServiceHelper<
    typeof latestFieldsSchema,
    typeof SeatRescheduledAuditActionService.storedDataSchema
  >;

  private v1 = new SeatRescheduledV1();
  private v2 = new SeatRescheduledV2();

  constructor() {
    this.helper = new AuditActionServiceHelper({
      latestVersion: SeatRescheduledAuditActionService.VERSION,
      latestFieldsSchema,
      storedDataSchema: SeatRescheduledAuditActionService.storedDataSchema,
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

  async getDisplayTitle({ storedData, userTimeZone }: GetDisplayTitleParams): Promise<TranslationWithParams> {
    const parsed = this.parseStored(storedData);
    const fields = parsed.fields as Pick<FieldsSchemaV2, "startTime" | "rescheduledToBookingUid">;
    const rescheduledToBookingUid = fields.rescheduledToBookingUid.new;

    const oldDate = fields.startTime.old
      ? AuditActionServiceHelper.formatDateInTimeZone(fields.startTime.old, userTimeZone)
      : "";
    const newDate = fields.startTime.new
      ? AuditActionServiceHelper.formatDateInTimeZone(fields.startTime.new, userTimeZone)
      : "";

    return {
      key: "booking_audit_action.seat_rescheduled",
      params: {
        oldDate,
        newDate,
      },
      components: rescheduledToBookingUid
        ? [{ type: "link", href: `/bookings?uid=${rescheduledToBookingUid}&activeSegment=history` }]
        : undefined,
    };
  }

  getDataRequirements(storedData: BaseStoredAuditData): DataRequirements {
    const parsed = this.parseStored(storedData);
    if (parsed.version === 1) {
      return this.v1.getDataRequirements();
    }
    return this.v2.getDataRequirements(parsed.fields);
  }

  getDisplayJson({ storedData, userTimeZone }: GetDisplayJsonParams): SeatRescheduledAuditDisplayData {
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

export type SeatRescheduledAuditData = z.infer<typeof fieldsSchemaV2>;

export type SeatRescheduledAuditDisplayDataV1 = {
  seatReferenceUid: string;
  attendeeEmail: string;
  previousStartTime: string | null;
  newStartTime: string | null;
  previousEndTime: string | null;
  newEndTime: string | null;
  rescheduledToBookingUid: string | null;
};

export type SeatRescheduledAuditDisplayDataV2 = {
  seatReferenceUid: string;
  attendeeId: number;
  previousStartTime: string | null;
  newStartTime: string | null;
  previousEndTime: string | null;
  newEndTime: string | null;
  rescheduledToBookingUid: string | null;
};

export type SeatRescheduledAuditDisplayData =
  | SeatRescheduledAuditDisplayDataV1
  | SeatRescheduledAuditDisplayDataV2;
