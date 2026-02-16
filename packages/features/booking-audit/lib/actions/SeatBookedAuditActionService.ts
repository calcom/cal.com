import { z } from "zod";

import type { BaseStoredAuditData } from "./IAuditActionService";
import type { DataRequirements } from "../service/EnrichmentDataStore";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type {
  GetDisplayTitleParams,
  GetDisplayJsonParams,
  GetDisplayFieldsParams,
  IAuditActionService,
  TranslationWithParams,
} from "./IAuditActionService";

/**
 * Seat Booked Audit Action Service
 * Handles SEAT_BOOKED action with per-action versioning
 *
 * Note: SEAT_BOOKED action captures initial state, so it doesn't use { old, new } pattern
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

export class SeatBookedAuditActionService implements IAuditActionService {
  readonly VERSION = 2;
  public static readonly TYPE = "SEAT_BOOKED" as const;
  private static dataSchemaV1 = z.object({
    version: z.literal(1),
    fields: fieldsSchemaV1,
  });
  private static dataSchemaV2 = z.object({
    version: z.literal(2),
    fields: fieldsSchemaV2,
  });
  public static readonly latestFieldsSchema = fieldsSchemaV2;
  public static readonly storedDataSchema = z.union([
    SeatBookedAuditActionService.dataSchemaV2,
    SeatBookedAuditActionService.dataSchemaV1,
  ]);
  public static readonly storedFieldsSchema = z.union([fieldsSchemaV2, fieldsSchemaV1]);
  private helper: AuditActionServiceHelper<
    typeof SeatBookedAuditActionService.latestFieldsSchema,
    typeof SeatBookedAuditActionService.storedDataSchema
  >;

  constructor() {
    this.helper = new AuditActionServiceHelper({
      latestVersion: this.VERSION,
      latestFieldsSchema: SeatBookedAuditActionService.latestFieldsSchema,
      storedDataSchema: SeatBookedAuditActionService.storedDataSchema,
    });
  }

  getVersionedData(fields: unknown) {
    const v2Result = fieldsSchemaV2.safeParse(fields);
    if (v2Result.success) {
      return { version: 2, fields: v2Result.data };
    }
    const v1Result = fieldsSchemaV1.safeParse(fields);
    if (v1Result.success) {
      return { version: 1, fields: v1Result.data };
    }
    return this.helper.getVersionedData(fields);
  }

  parseStored(data: unknown) {
    return this.helper.parseStored(data);
  }

  getVersion(data: unknown): number {
    return this.helper.getVersion(data);
  }

  migrateToLatest(data: unknown) {
    const v2Result = fieldsSchemaV2.safeParse(data);
    if (v2Result.success) {
      return { isMigrated: false, latestData: v2Result.data };
    }
    const v1Result = fieldsSchemaV1.safeParse(data);
    if (v1Result.success) {
      return { isMigrated: false, latestData: v1Result.data };
    }
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        message: "Data does not match any known SeatBooked schema version",
        path: [],
      },
    ]);
  }

  getDataRequirements(storedData: BaseStoredAuditData): DataRequirements {
    const parsed = this.parseStored(storedData);
    if (parsed.version === 2) {
      const fields = fieldsSchemaV2.parse(parsed.fields);
      return { attendeeIds: [fields.attendeeId] };
    }
    return { userUuids: [] };
  }

  async getDisplayTitle(_: GetDisplayTitleParams): Promise<TranslationWithParams> {
    return { key: "booking_audit_action.seat_booked" };
  }

  getDisplayJson({ storedData, userTimeZone }: GetDisplayJsonParams): SeatBookedAuditDisplayData {
    const parsed = this.parseStored(storedData);

    if (parsed.version === 2) {
      const fields = fieldsSchemaV2.parse(parsed.fields);
      return {
        seatReferenceUid: fields.seatReferenceUid,
        attendeeId: fields.attendeeId,
        startTime: AuditActionServiceHelper.formatDateTimeInTimeZone(fields.startTime, userTimeZone),
        endTime: AuditActionServiceHelper.formatDateTimeInTimeZone(fields.endTime, userTimeZone),
      };
    }

    const fields = fieldsSchemaV1.parse(parsed.fields);
    return {
      seatReferenceUid: fields.seatReferenceUid,
      attendeeId: null,
      startTime: AuditActionServiceHelper.formatDateTimeInTimeZone(fields.startTime, userTimeZone),
      endTime: AuditActionServiceHelper.formatDateTimeInTimeZone(fields.endTime, userTimeZone),
    };
  }

  async getDisplayFields({ storedData, dbStore }: GetDisplayFieldsParams): Promise<
    Array<{
      labelKey: string;
      value?: string;
    }>
  > {
    const parsed = this.parseStored(storedData);

    if (parsed.version === 2) {
      const fields = fieldsSchemaV2.parse(parsed.fields);
      const attendee = dbStore.getAttendeeById(fields.attendeeId);
      return [
        {
          labelKey: "booking_audit_action.attendee",
          value: attendee?.name ?? attendee?.email ?? "Unknown",
        },
      ];
    }

    return [];
  }
}

export type SeatBookedAuditData = z.infer<typeof fieldsSchemaV2>;

export type SeatBookedAuditDisplayData = {
  seatReferenceUid: string;
  attendeeId: number | null;
  startTime: string;
  endTime: string;
};
