import type { Ensure } from "@calcom/types/utils";
import { z } from "zod";
import { BooleanChangeSchema } from "../common/changeSchemas";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type {
  GetDisplayFieldsParams,
  GetDisplayJsonParams,
  GetDisplayTitleParams,
  IAuditActionService,
  TranslationWithParams,
} from "./IAuditActionService";

const fieldsSchemaV1 = z
  // Make changes as per this new schema
  .object({
    host: z
      .object({
        userUuid: z.string(),
        noShow: BooleanChangeSchema,
      })
      .optional(),
    attendeesNoShow: z.record(z.coerce.number(), BooleanChangeSchema).optional(),
  })
  .refine((data) => data.hostNoShow !== undefined || data.attendeesNoShow !== undefined, {
    message: "At least one of hostNoShow or attendeesNoShow must be provided",
  });

export class NoShowUpdatedAuditActionService implements IAuditActionService {
  readonly VERSION = 1;
  public static readonly TYPE = "NO_SHOW_UPDATED" as const;
  private static dataSchemaV1 = z.object({
    version: z.literal(1),
    fields: fieldsSchemaV1,
  });
  private static fieldsSchemaV1 = fieldsSchemaV1;
  public static readonly latestFieldsSchema = fieldsSchemaV1;
  // Union of all versions
  public static readonly storedDataSchema = NoShowUpdatedAuditActionService.dataSchemaV1;
  // Union of all versions
  public static readonly storedFieldsSchema = NoShowUpdatedAuditActionService.fieldsSchemaV1;
  private helper: AuditActionServiceHelper<
    typeof NoShowUpdatedAuditActionService.latestFieldsSchema,
    typeof NoShowUpdatedAuditActionService.storedDataSchema
  >;

  constructor() {
    this.helper = new AuditActionServiceHelper({
      latestVersion: this.VERSION,
      latestFieldsSchema: NoShowUpdatedAuditActionService.latestFieldsSchema,
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

  migrateToLatest(data: unknown) {
    // V1-only: validate and return as-is (no migration needed)
    const validated = fieldsSchemaV1.parse(data);
    return { isMigrated: false, latestData: validated };
  }

  private isHostNoShowSet(
    fields: NoShowUpdatedAuditData
  ): fields is Ensure<NoShowUpdatedAuditData, "hostNoShow"> {
    return fields.hostNoShow !== undefined;
  }

  private isAttendeesNoShowSet(
    fields: NoShowUpdatedAuditData
  ): fields is Ensure<NoShowUpdatedAuditData, "attendeesNoShow"> {
    return fields.attendeesNoShow !== undefined;
  }

  async getDisplayTitle({ storedData }: GetDisplayTitleParams): Promise<TranslationWithParams> {
    const { fields } = this.parseStored({ version: storedData.version, fields: storedData.fields });
    if (this.isHostNoShowSet(fields) && this.isAttendeesNoShowSet(fields)) {
      return { key: "booking_audit_action.no_show_updated" };
    }
    if (this.isHostNoShowSet(fields)) {
      return { key: "booking_audit_action.host_no_show_updated" };
    }
    if (this.isAttendeesNoShowSet(fields)) {
      return { key: "booking_audit_action.attendee_no_show_updated" };
    }
    throw new Error("Audit action data is invalid");
  }

  async getDisplayFields({ storedData }: GetDisplayFieldsParams): Promise<
    Array<{
      labelKey: string;
      valueKey: string;
    }>
  > {
    const { fields } = this.parseStored(storedData);
    let attendeesFieldValue: string;
    let hostFieldValue: Array<{ labelKey: string; valueKey: string }> = [];
    const fields: { labelKey: string; valueKey: string }[] = [];
    if (this.isAttendeesNoShowSet(fields)) {
      const attendeeIds = Object.keys(fields.attendeesNoShow).map(Number);
      const dbAttendees = await this.deps.attendeeRepository.findByIds(attendeeIds);

      const attendeesFieldValueParts = dbAttendees.map((dbAttendee) => {
        const attendeeNoShow = fields.attendeesNoShow?.[dbAttendee.id];
        let valueKey = "";
        if (attendeeNoShow) {
          valueKey = attendeeNoShow.new ? "Yes" : "No";
        }
        return `${dbAttendee.name}:${valueKey}`;
      });
      attendeesFieldValue = attendeesFieldValueParts.join(", ");
      fields.push({ labelKey: "Attendees", valueKey: attendeesFieldValue });
    }
    if (this.isHostNoShowSet(fields)) {
      const user = await this.deps.userRepository.findByUuid({ uuid: fields.host?.userUuid });
      const hostName = user?.name || "Unknown";
      hostFieldValue = `${hostName}:${fields.host?.noShow.new ? "Yes" : "No"}`;
      fields.push({ labelKey: "Host", valueKey: hostFieldValue });
    }
    return fields;
  }

  getDisplayJson({ storedData }: GetDisplayJsonParams): NoShowUpdatedAuditDisplayData {
    const { fields } = this.parseStored({ version: storedData.version, fields: storedData.fields });
    return {
      ...(this.isHostNoShowSet(fields)
        ? {
            hostNoShow: fields.hostNoShow.new,
            previousHostNoShow: fields.hostNoShow.old,
          }
        : {}),
      ...(this.isAttendeesNoShowSet(fields)
        ? {
            attendeesNoShow: fields.attendeesNoShow,
          }
        : {}),
    };
  }
}

export type NoShowUpdatedAuditData = z.infer<typeof fieldsSchemaV1>;

export type NoShowUpdatedAuditDisplayData = {
  hostNoShow?: boolean;
  previousHostNoShow?: boolean | null;
  attendeesNoShow?: Record<number, { old: boolean | null; new: boolean }> | null;
};
