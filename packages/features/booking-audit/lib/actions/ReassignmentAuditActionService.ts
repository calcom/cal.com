import { z } from "zod";

import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { StringChangeSchema, NumberChangeSchema } from "../common/changeSchemas";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService, TranslationWithParams, GetDisplayTitleParams, GetDisplayJsonParams, BaseStoredAuditData } from "./IAuditActionService";

/**
 * Reassignment Audit Action Service
 * Handles REASSIGNMENT action with per-action versioning
 */

// Module-level because it is passed to IAuditActionService type outside the class scope
const fieldsSchemaV1 = z.object({
    assignedToId: NumberChangeSchema,
    assignedById: NumberChangeSchema,
    reassignmentReason: StringChangeSchema,
    reassignmentType: z.enum(["manual", "roundRobin"]),
    userPrimaryEmail: StringChangeSchema.optional(),
    title: StringChangeSchema.optional(),
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
        const user = await this.userRepository.findById({ id: fields.assignedToId.new });
        const reassignedToName = user?.name || "Unknown";
        return {
            key: "booking_audit_action.booking_reassigned_to_host",
            params: { host: reassignedToName },
        };
    }

    getDisplayJson({
        storedData,
    }: GetDisplayJsonParams): ReassignmentAuditDisplayData {
        const { fields } = this.parseStored(storedData);
        return {
            newAssignedToId: fields.assignedToId.new,
            reassignmentReason: fields.reassignmentReason.new ?? null,
        };
    }

    getDisplayFields(storedData: BaseStoredAuditData): Array<{
        labelKey: string;
        valueKey: string;
    }> {
        const { fields } = storedData;
        const typeTranslationKey = `booking_audit_action.assignmentType_${fields.reassignmentType}`;

        return [
            {
                labelKey: "booking_audit_action.type",
                valueKey: typeTranslationKey,
            }
        ];
    }
}

export type ReassignmentAuditData = z.infer<typeof fieldsSchemaV1>;

export type ReassignmentAuditDisplayData = {
    newAssignedToId: number;
    reassignmentReason: string | null;
};
