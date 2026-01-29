import { z } from "zod";

import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type {
  GetDisplayTitleParams,
  GetDisplayJsonParams,
  IAuditActionService,
  TranslationWithParams,
} from "./IAuditActionService";

/**
 * Seat Booked Audit Action Service
 * Handles SEAT_BOOKED action with per-action versioning
 *
 * Note: SEAT_BOOKED action captures initial state, so it doesn't use { old, new } pattern
 */

// Module-level because it is passed to IAuditActionService type outside the class scope
const fieldsSchemaV1 = z.object({
  seatReferenceUid: z.string(),
  attendeeEmail: z.string(),
  attendeeName: z.string(),
  startTime: z.number(),
  endTime: z.number(),
});

export class SeatBookedAuditActionService implements IAuditActionService {
  readonly VERSION = 1;
  public static readonly TYPE = "SEAT_BOOKED" as const;
  private static dataSchemaV1 = z.object({
    version: z.literal(1),
    fields: fieldsSchemaV1,
  });
  private static fieldsSchemaV1 = fieldsSchemaV1;
  public static readonly latestFieldsSchema = fieldsSchemaV1;
  // Union of all versions
  public static readonly storedDataSchema = SeatBookedAuditActionService.dataSchemaV1;
  // Union of all versions
  public static readonly storedFieldsSchema = SeatBookedAuditActionService.fieldsSchemaV1;
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
    return { key: "booking_audit_action.seat_booked" };
  }

  getDisplayJson({ storedData, userTimeZone }: GetDisplayJsonParams): SeatBookedAuditDisplayData {
    const { fields } = this.parseStored(storedData);

    return {
      seatReferenceUid: fields.seatReferenceUid,
      attendeeEmail: fields.attendeeEmail,
      attendeeName: fields.attendeeName,
      startTime: AuditActionServiceHelper.formatDateTimeInTimeZone(fields.startTime, userTimeZone),
      endTime: AuditActionServiceHelper.formatDateTimeInTimeZone(fields.endTime, userTimeZone),
    };
  }
}

export type SeatBookedAuditData = z.infer<typeof fieldsSchemaV1>;

export type SeatBookedAuditDisplayData = {
  seatReferenceUid: string;
  attendeeEmail: string;
  attendeeName: string;
  startTime: string;
  endTime: string;
};
