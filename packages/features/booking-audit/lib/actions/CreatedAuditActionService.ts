import { BookingStatus } from "@calcom/prisma/enums";
import { z } from "zod";
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
 * Created Audit Action Service
 *
 * Note: CREATED action captures initial state, so it doesn't use { old, new } pattern
 */

// Module-level because it is passed to IAuditActionService type outside the class scope
const fieldsSchemaV1 = z.object({
  startTime: z.number(),
  endTime: z.number(),
  status: z.nativeEnum(BookingStatus),
  hostUserUuid: z.string().nullable(),
  // Allowing it to be optional because most of the time(non-seated booking) it won't be there
  seatReferenceUid: z.string().nullish(),
});

const latestFieldsSchema = fieldsSchemaV1;

export class CreatedAuditActionService implements IAuditActionService {
  static readonly VERSION = 1;
  public static readonly TYPE = "CREATED" as const;
  private static dataSchemaV1 = z.object({
    version: z.literal(1),
    fields: fieldsSchemaV1,
  });
  private static fieldsSchemaV1 = fieldsSchemaV1;
  public static readonly latestFieldsSchema = latestFieldsSchema;
  // Union of all versions
  public static readonly storedDataSchema = CreatedAuditActionService.dataSchemaV1;
  // Union of all versions
  public static readonly storedFieldsSchema = CreatedAuditActionService.fieldsSchemaV1;
  private helper: AuditActionServiceHelper<
    typeof latestFieldsSchema,
    typeof CreatedAuditActionService.storedDataSchema
  >;

  constructor() {
    this.helper = new AuditActionServiceHelper({
      latestVersion: CreatedAuditActionService.VERSION,
      latestFieldsSchema,
      storedDataSchema: CreatedAuditActionService.storedDataSchema,
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

  getDataRequirements(storedData: BaseStoredAuditData): DataRequirements {
    const { fields } = this.parseStored(storedData);
    return {
      userUuids: fields.hostUserUuid ? [fields.hostUserUuid] : [],
    };
  }

  async getDisplayTitle({ storedData, dbStore }: GetDisplayTitleParams): Promise<TranslationWithParams> {
    const { fields } = this.parseStored(storedData);
    const hostUser = fields.hostUserUuid ? dbStore.getUserByUuid(fields.hostUserUuid) : null;
    const hostName = hostUser?.name || "Unknown";
    if (fields.seatReferenceUid) {
      return { key: "booking_audit_action.created_with_seat", params: { host: hostName } };
    }
    return { key: "booking_audit_action.created", params: { host: hostName } };
  }

  getDisplayJson({ storedData, userTimeZone }: GetDisplayJsonParams): CreatedAuditDisplayData {
    const { fields } = this.parseStored({ version: storedData.version, fields: storedData.fields });
    const timeZone = userTimeZone;

    return {
      startTime: AuditActionServiceHelper.formatDateTimeInTimeZone(fields.startTime, timeZone),
      endTime: AuditActionServiceHelper.formatDateTimeInTimeZone(fields.endTime, timeZone),
      status: fields.status,
      ...(fields.seatReferenceUid ? { seatReferenceUid: fields.seatReferenceUid } : {}),
    };
  }
}

export type CreatedAuditData = z.infer<typeof fieldsSchemaV1>;

export type CreatedAuditDisplayData = {
  startTime: string;
  endTime: string;
  status: BookingStatus;
  seatReferenceUid?: string;
};
