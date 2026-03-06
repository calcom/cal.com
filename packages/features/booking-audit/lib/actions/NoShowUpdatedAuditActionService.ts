import type { Ensure } from "@calcom/types/utils";
import { z } from "zod";
import { BooleanChangeSchema } from "../common/changeSchemas";
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
 * V1: Stored attendeeEmail (PII in payload)
 * V2: Stores attendeeId only (PII-free), enriched via EnrichmentDataStore at display time
 */

const AttendeeNoShowSchemaV1 = z.object({
  attendeeEmail: z.string(),
  noShow: BooleanChangeSchema,
});

const AttendeeNoShowSchemaV2 = z.object({
  attendeeId: z.number(),
  noShow: BooleanChangeSchema,
});

function ensureHostOrAttendeeNoShow(data: { host?: unknown; attendeesNoShow?: unknown }) {
  return data.host !== undefined || data.attendeesNoShow !== undefined;
}

const fieldsSchemaV1 = z
  .object({
    host: z
      .object({
        userUuid: z.string(),
        noShow: BooleanChangeSchema,
      })
      .optional(),
    attendeesNoShow: z.array(AttendeeNoShowSchemaV1).optional(),
  })
  .refine(ensureHostOrAttendeeNoShow, {
    message: "At least one of host or attendeesNoShow must be provided",
  });

const fieldsSchemaV2 = z
  .object({
    host: z
      .object({
        userUuid: z.string(),
        noShow: BooleanChangeSchema,
      })
      .optional(),
    attendeesNoShow: z.array(AttendeeNoShowSchemaV2).optional(),
  })
  .refine(ensureHostOrAttendeeNoShow, {
    message: "At least one of host or attendeesNoShow must be provided",
  });

const latestFieldsSchema = fieldsSchemaV2;

class NoShowUpdatedV1 {
  static readonly dataSchema = z.object({
    version: z.literal(1),
    fields: fieldsSchemaV1,
  });

  private isHostSet(fields: NoShowUpdatedAuditDataV1): fields is Ensure<NoShowUpdatedAuditDataV1, "host"> {
    return fields.host !== undefined;
  }

  private isAttendeesNoShowSet(
    fields: NoShowUpdatedAuditDataV1
  ): fields is Ensure<NoShowUpdatedAuditDataV1, "attendeesNoShow"> {
    return fields.attendeesNoShow !== undefined;
  }

  getDataRequirements(fields: NoShowUpdatedAuditDataV1): DataRequirements {
    const userUuids: string[] = [];
    if (this.isHostSet(fields)) {
      userUuids.push(fields.host.userUuid);
    }
    return { userUuids };
  }

  getDisplayTitle(fields: NoShowUpdatedAuditDataV1): TranslationWithParams {
    if (this.isHostSet(fields) && this.isAttendeesNoShowSet(fields)) {
      return { key: "booking_audit_action.no_show_updated" };
    }
    if (this.isHostSet(fields)) {
      return { key: "booking_audit_action.host_no_show_updated" };
    }
    if (this.isAttendeesNoShowSet(fields)) {
      return { key: "booking_audit_action.attendee_no_show_updated" };
    }
    throw new Error("Audit action data is invalid");
  }

  getDisplayJson(fields: NoShowUpdatedAuditDataV1): NoShowUpdatedAuditDisplayData {
    const result: NoShowUpdatedAuditDisplayData = {};
    if (this.isHostSet(fields)) {
      result.hostNoShow = fields.host.noShow.new;
      result.previousHostNoShow = fields.host.noShow.old;
    }
    if (this.isAttendeesNoShowSet(fields)) {
      result.attendeesNoShow = fields.attendeesNoShow.map((a) => ({
        attendeeEmail: a.attendeeEmail,
        noShow: a.noShow,
      }));
    }
    return result;
  }

  getDisplayFields(
    fields: NoShowUpdatedAuditDataV1,
    dbStore: GetDisplayFieldsParams["dbStore"]
  ): Array<DisplayField> {
    const displayFields: DisplayField[] = [];
    if (this.isAttendeesNoShowSet(fields)) {
      const attendeesFieldValues = fields.attendeesNoShow.map((attendee) => {
        const noShowStatus = attendee.noShow.new ? "Yes" : "No";
        return `${attendee.attendeeEmail}: ${noShowStatus}`;
      });
      displayFields.push({ labelKey: "booking_audit_action.attendees", fieldValue: { type: "rawValues", values: attendeesFieldValues } });
    }
    if (this.isHostSet(fields)) {
      const user = dbStore.getUserByUuid(fields.host.userUuid);
      const hostName = user?.name || "Unknown";
      const hostFieldValue = `${hostName}: ${fields.host.noShow.new ? "Yes" : "No"}`;
      displayFields.push({ labelKey: "booking_audit_action.host", fieldValue: { type: "rawValue", value: hostFieldValue } });
    }
    return displayFields;
  }
}

class NoShowUpdatedV2 {
  static readonly dataSchema = z.object({
    version: z.literal(2),
    fields: fieldsSchemaV2,
  });

  private isHostSet(fields: NoShowUpdatedAuditDataV2): fields is Ensure<NoShowUpdatedAuditDataV2, "host"> {
    return fields.host !== undefined;
  }

  private isAttendeesNoShowSet(
    fields: NoShowUpdatedAuditDataV2
  ): fields is Ensure<NoShowUpdatedAuditDataV2, "attendeesNoShow"> {
    return fields.attendeesNoShow !== undefined;
  }

  getDataRequirements(fields: NoShowUpdatedAuditDataV2): DataRequirements {
    const userUuids: string[] = [];
    const attendeeIds: number[] = [];
    if (this.isHostSet(fields)) {
      userUuids.push(fields.host.userUuid);
    }
    if (this.isAttendeesNoShowSet(fields)) {
      for (const attendee of fields.attendeesNoShow) {
        attendeeIds.push(attendee.attendeeId);
      }
    }
    return { userUuids, attendeeIds };
  }

  getDisplayTitle(fields: NoShowUpdatedAuditDataV2): TranslationWithParams {
    if (this.isHostSet(fields) && this.isAttendeesNoShowSet(fields)) {
      return { key: "booking_audit_action.no_show_updated" };
    }
    if (this.isHostSet(fields)) {
      return { key: "booking_audit_action.host_no_show_updated" };
    }
    if (this.isAttendeesNoShowSet(fields)) {
      return { key: "booking_audit_action.attendee_no_show_updated" };
    }
    throw new Error("Audit action data is invalid");
  }

  getDisplayJson(fields: NoShowUpdatedAuditDataV2): NoShowUpdatedAuditDisplayData {
    const result: NoShowUpdatedAuditDisplayData = {};
    if (this.isHostSet(fields)) {
      result.hostNoShow = fields.host.noShow.new;
      result.previousHostNoShow = fields.host.noShow.old;
    }
    if (this.isAttendeesNoShowSet(fields)) {
      result.attendeesNoShow = fields.attendeesNoShow.map((a) => ({
        attendeeId: a.attendeeId,
        noShow: a.noShow,
      }));
    }
    return result;
  }

  getDisplayFields(
    fields: NoShowUpdatedAuditDataV2,
    dbStore: GetDisplayFieldsParams["dbStore"]
  ): Array<DisplayField> {
    const displayFields: DisplayField[] = [];
    if (this.isAttendeesNoShowSet(fields)) {
      const attendeesFieldValues = fields.attendeesNoShow.map((attendee) => {
        const enriched = dbStore.getAttendeeById(attendee.attendeeId);
        const attendeeName = enriched?.name ?? enriched?.email ?? "Unknown";
        const noShowStatus = attendee.noShow.new ? "Yes" : "No";
        return `${attendeeName}: ${noShowStatus}`;
      });
      displayFields.push({ labelKey: "booking_audit_action.attendees", fieldValue: { type: "rawValues", values: attendeesFieldValues } });
    }
    if (this.isHostSet(fields)) {
      const user = dbStore.getUserByUuid(fields.host.userUuid);
      const hostName = user?.name || "Unknown";
      const hostFieldValue = `${hostName}: ${fields.host.noShow.new ? "Yes" : "No"}`;
      displayFields.push({ labelKey: "booking_audit_action.host", fieldValue: { type: "rawValue", value: hostFieldValue } });
    }
    return displayFields;
  }
}

type ParsedV1 = z.infer<typeof NoShowUpdatedV1.dataSchema>;
type ParsedV2 = z.infer<typeof NoShowUpdatedV2.dataSchema>;

export class NoShowUpdatedAuditActionService implements IAuditActionService {
  static readonly VERSION = 2;
  public static readonly TYPE = "NO_SHOW_UPDATED" as const;

  public static readonly latestFieldsSchema = latestFieldsSchema;
  public static readonly storedDataSchema = z.union([NoShowUpdatedV2.dataSchema, NoShowUpdatedV1.dataSchema]);

  private helper: AuditActionServiceHelper<
    typeof latestFieldsSchema,
    typeof NoShowUpdatedAuditActionService.storedDataSchema
  >;

  private v1 = new NoShowUpdatedV1();
  private v2 = new NoShowUpdatedV2();

  constructor() {
    this.helper = new AuditActionServiceHelper({
      latestVersion: NoShowUpdatedAuditActionService.VERSION,
      latestFieldsSchema,
      storedDataSchema: NoShowUpdatedAuditActionService.storedDataSchema,
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

  /**
   * Parse stored data and return a properly discriminated union.
   * Parses with the individual V1/V2 schema based on version, so TypeScript
   * can narrow `parsed.fields` through the `version` literal discriminant.
   * (The generic `parseStored` loses literal types due to ZodEffects from .refine())
   */
  private parseVersioned(storedData: BaseStoredAuditData): ParsedV1 | ParsedV2 {
    const version = this.getVersion(storedData);
    if (version === 1) {
      return NoShowUpdatedV1.dataSchema.parse(storedData);
    }
    return NoShowUpdatedV2.dataSchema.parse(storedData);
  }

  getDataRequirements(storedData: BaseStoredAuditData): DataRequirements {
    const parsed = this.parseVersioned(storedData);
    if (parsed.version === 1) {
      return this.v1.getDataRequirements(parsed.fields);
    }
    return this.v2.getDataRequirements(parsed.fields);
  }

  async getDisplayTitle({ storedData }: GetDisplayTitleParams): Promise<TranslationWithParams> {
    const parsed = this.parseVersioned(storedData);
    if (parsed.version === 1) {
      return this.v1.getDisplayTitle(parsed.fields);
    }
    return this.v2.getDisplayTitle(parsed.fields);
  }

  getDisplayJson({ storedData }: GetDisplayJsonParams): NoShowUpdatedAuditDisplayData {
    const parsed = this.parseVersioned(storedData);
    if (parsed.version === 1) {
      return this.v1.getDisplayJson(parsed.fields);
    }
    return this.v2.getDisplayJson(parsed.fields);
  }

  async getDisplayFields({ storedData, dbStore }: GetDisplayFieldsParams): Promise<Array<DisplayField>> {
    const parsed = this.parseVersioned(storedData);
    if (parsed.version === 1) {
      return this.v1.getDisplayFields(parsed.fields, dbStore);
    }
    return this.v2.getDisplayFields(parsed.fields, dbStore);
  }
}

export type NoShowUpdatedAuditDataV1 = z.infer<typeof fieldsSchemaV1>;
export type NoShowUpdatedAuditDataV2 = z.infer<typeof fieldsSchemaV2>;
export type NoShowUpdatedAuditData = NoShowUpdatedAuditDataV2;

export type NoShowUpdatedAuditDisplayDataV1 = {
  hostNoShow?: boolean;
  previousHostNoShow?: boolean | null;
  attendeesNoShow?: Array<{
    attendeeEmail: string;
    noShow: { old: boolean | null; new: boolean };
  }> | null;
};

export type NoShowUpdatedAuditDisplayDataV2 = {
  hostNoShow?: boolean;
  previousHostNoShow?: boolean | null;
  attendeesNoShow?: Array<{
    attendeeId: number;
    noShow: { old: boolean | null; new: boolean };
  }> | null;
};

export type NoShowUpdatedAuditDisplayData = NoShowUpdatedAuditDisplayDataV1 | NoShowUpdatedAuditDisplayDataV2;
