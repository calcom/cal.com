import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { z } from "zod";
import { StringChangeSchema } from "../common/changeSchemas";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type {
  GetDisplayFieldsParams,
  GetDisplayJsonParams,
  GetDisplayTitleParams,
  IAuditActionService,
  TranslationWithParams,
} from "./IAuditActionService";

/**
 * Reassignment Audit Action Service
 * Handles REASSIGNMENT action with per-action versioning
 */

// Module-level because it is passed to IAuditActionService type outside the class scope
const fieldsSchemaV1 = z.object({
  organizerUuid: StringChangeSchema.optional(),
  hostAttendeeUpdated: z
    .object({
      id: z.number().optional(),
      withUserUuid: StringChangeSchema.optional(),
    })
    .optional(),
  reassignmentReason: z.string().nullable(),
  reassignmentType: z.enum(["manual", "roundRobin"]),
});

export class ReassignmentAuditActionService implements IAuditActionService {
  readonly VERSION = 1;
  public static readonly TYPE = "REASSIGNMENT" as const;
  private static dataSchemaV1 = z.object({
    version: z.literal(1),
    fields: fieldsSchemaV1,
  });
  private static fieldsSchemaV1 = fieldsSchemaV1;
  public static readonly latestFieldsSchema = fieldsSchemaV1;
  // Union of all versions
  public static readonly storedDataSchema = ReassignmentAuditActionService.dataSchemaV1;
  // Union of all versions
  public static readonly storedFieldsSchema = ReassignmentAuditActionService.fieldsSchemaV1;
  private helper: AuditActionServiceHelper<
    typeof ReassignmentAuditActionService.latestFieldsSchema,
    typeof ReassignmentAuditActionService.storedDataSchema
  >;

  constructor(private userRepository: UserRepository) {
    this.helper = new AuditActionServiceHelper({
      latestVersion: this.VERSION,
      latestFieldsSchema: ReassignmentAuditActionService.latestFieldsSchema,
      storedDataSchema: ReassignmentAuditActionService.storedDataSchema,
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

  async getDisplayTitle({ storedData }: GetDisplayTitleParams): Promise<TranslationWithParams> {
    const { fields } = this.parseStored(storedData);
    const { newUser } = await this.getPreviousAndNewAssigneeUser(fields);
    const reassignedToName = newUser?.name || "Unknown";
    return {
      key: "booking_audit_action.booking_reassigned_to_host",
      params: { host: reassignedToName },
    };
  }

  getDisplayJson({ storedData }: GetDisplayJsonParams): ReassignmentAuditDisplayData {
    const { fields } = this.parseStored(storedData);
    return {
      ...(fields.organizerUuid
        ? {
            previousOrganizerUuid: fields.organizerUuid.old,
            newOrganizerUuid: fields.organizerUuid.new,
          }
        : {}),

      ...(fields.hostAttendeeUpdated
        ? {
            hostAttendeeIdUpdated: fields.hostAttendeeUpdated.id,
            hostAttendeeUserUuidNew: fields.hostAttendeeUpdated.withUserUuid?.new,
            hostAttendeeUserUuidOld: fields.hostAttendeeUpdated.withUserUuid?.old,
          }
        : {}),
      reassignmentReason: fields.reassignmentReason ?? null,
    };
  }

  private async getPreviousAndNewAssigneeUser(fields: ReassignmentAuditData) {
    const hasAttendeeUpdated = fields.hostAttendeeUpdated != null;
    const newHostUuid = hasAttendeeUpdated
      ? fields.hostAttendeeUpdated?.withUserUuid?.new
      : fields.organizerUuid?.new;
    const previousHostUuid = hasAttendeeUpdated
      ? fields.hostAttendeeUpdated?.withUserUuid?.old
      : fields.organizerUuid?.old;

    const newUser = newHostUuid ? await this.userRepository.findByUuid({ uuid: newHostUuid }) : null;
    const previousUser = previousHostUuid
      ? await this.userRepository.findByUuid({ uuid: previousHostUuid })
      : null;

    return {
      previousUser: previousUser,
      newUser: newUser,
    };
  }

  async getDisplayFields({ storedData }: GetDisplayFieldsParams): Promise<
    Array<{
      labelKey: string;
      valueKey: string;
    }>
  > {
    const { fields } = this.parseStored(storedData);
    const map = {
      manual: "manual",
      roundRobin: "round_robin",
    };
    const typeTranslationKey = `booking_audit_action.assignment_type_${map[fields.reassignmentType]}`;
    const { previousUser } = await this.getPreviousAndNewAssigneeUser(fields);
    return [
      {
        labelKey: "booking_audit_action.assignment_type",
        valueKey: typeTranslationKey,
      },
      {
        labelKey: "booking_audit_action.previous_assignee",
        valueKey: previousUser?.name ?? "Unknown",
      },
    ];
  }
}

export type ReassignmentAuditData = z.infer<typeof fieldsSchemaV1>;

export type ReassignmentAuditDisplayData = {
  previousOrganizerUuid?: string | null;
  newOrganizerUuid?: string | null;
  hostAttendeeIdUpdated?: number | null;
  hostAttendeeUserUuidNew?: string | null;
  hostAttendeeUserUuidOld?: string | null;
  reassignmentReason: string | null;
};
