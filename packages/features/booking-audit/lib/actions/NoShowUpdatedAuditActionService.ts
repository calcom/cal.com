import type { IAttendeeRepository } from "@calcom/features/bookings/repositories/IAttendeeRepository";
import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";
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

const AttendeeNoShowSchema = z.object({
  attendeeEmail: z.string(),
  noShow: BooleanChangeSchema,
});

const fieldsSchemaV1 = z
  .object({
    host: z
      .object({
        userUuid: z.string(),
        noShow: BooleanChangeSchema,
      })
      .optional(),
    attendeesNoShow: z.array(AttendeeNoShowSchema).optional(),
  })
  .refine((data) => data.host !== undefined || data.attendeesNoShow !== undefined, {
    message: "At least one of host or attendeesNoShow must be provided",
  });

type Deps = {
  attendeeRepository: IAttendeeRepository;
  userRepository: UserRepository;
};

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

  constructor(private readonly deps: Deps) {
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

  private isHostSet(fields: NoShowUpdatedAuditData): fields is Ensure<NoShowUpdatedAuditData, "host"> {
    return fields.host !== undefined;
  }

  private isAttendeesNoShowSet(
    fields: NoShowUpdatedAuditData
  ): fields is Ensure<NoShowUpdatedAuditData, "attendeesNoShow"> {
    return fields.attendeesNoShow !== undefined;
  }

  async getDisplayTitle({ storedData }: GetDisplayTitleParams): Promise<TranslationWithParams> {
    const { fields } = this.parseStored({ version: storedData.version, fields: storedData.fields });
    const parsedFields = fields as NoShowUpdatedAuditData;
    if (this.isHostSet(parsedFields) && this.isAttendeesNoShowSet(parsedFields)) {
      return { key: "booking_audit_action.no_show_updated" };
    }
    if (this.isHostSet(parsedFields)) {
      return { key: "booking_audit_action.host_no_show_updated" };
    }
    if (this.isAttendeesNoShowSet(parsedFields)) {
      return { key: "booking_audit_action.attendee_no_show_updated" };
    }
    throw new Error("Audit action data is invalid");
  }

  async getDisplayFields({ storedData }: GetDisplayFieldsParams): Promise<
    Array<{
      labelKey: string;
      valueKey?: string;
      value?: string;
      values?: string[];
    }>
  > {
    const { fields } = this.parseStored(storedData);
    const parsedFields = fields as NoShowUpdatedAuditData;
    const displayFields: { labelKey: string; valueKey?: string; value?: string; values?: string[] }[] = [];

    if (this.isAttendeesNoShowSet(parsedFields)) {
      const attendeesFieldValues = parsedFields.attendeesNoShow.map((attendee) => {
        const noShowStatus = attendee.noShow.new ? "Yes" : "No";
        return `${attendee.attendeeEmail}: ${noShowStatus}`;
      });
      displayFields.push({ labelKey: "Attendees", values: attendeesFieldValues });
    }

    if (this.isHostSet(parsedFields)) {
      const user = await this.deps.userRepository.findByUuid({ uuid: parsedFields.host.userUuid });
      const hostName = user?.name || "Unknown";
      const hostFieldValue = `${hostName}:${parsedFields.host.noShow.new ? "Yes" : "No"}`;
      displayFields.push({ labelKey: "Host", value: hostFieldValue });
    }

    return displayFields;
  }

  getDisplayJson({ storedData }: GetDisplayJsonParams): NoShowUpdatedAuditDisplayData {
    const { fields } = this.parseStored({ version: storedData.version, fields: storedData.fields });
    const parsedFields = fields as NoShowUpdatedAuditData;
    return {
      ...(this.isHostSet(parsedFields)
        ? {
            hostNoShow: parsedFields.host.noShow.new,
            previousHostNoShow: parsedFields.host.noShow.old,
          }
        : {}),
      ...(this.isAttendeesNoShowSet(parsedFields)
        ? {
            attendeesNoShow: parsedFields.attendeesNoShow,
          }
        : {}),
    };
  }
}

export type NoShowUpdatedAuditData = z.infer<typeof fieldsSchemaV1>;

export type NoShowUpdatedAuditDisplayData = {
  hostNoShow?: boolean;
  previousHostNoShow?: boolean | null;
  attendeesNoShow?: Array<{ attendeeEmail: string; noShow: { old: boolean | null; new: boolean } }> | null;
};
