import { z } from "zod";
import { BookingStatus } from "@calcom/prisma/enums";
import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";

import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService, TranslationWithParams, GetDisplayTitleParams, GetDisplayJsonParams } from "./IAuditActionService";

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

type Deps = {
    userRepository: UserRepository;
};
export class CreatedAuditActionService implements IAuditActionService {
    readonly VERSION = 1;
    public static readonly TYPE = "CREATED" as const;
    private static dataSchemaV1 = z.object({
        version: z.literal(1),
        fields: fieldsSchemaV1,
    });
    private static fieldsSchemaV1 = fieldsSchemaV1;
    public static readonly latestFieldsSchema = fieldsSchemaV1;
    // Union of all versions
    public static readonly storedDataSchema = CreatedAuditActionService.dataSchemaV1;
    // Union of all versions
    public static readonly storedFieldsSchema = CreatedAuditActionService.fieldsSchemaV1;
    private helper: AuditActionServiceHelper<typeof CreatedAuditActionService.latestFieldsSchema, typeof CreatedAuditActionService.storedDataSchema>;

    constructor(private readonly deps: Deps) {
        this.helper = new AuditActionServiceHelper({
            latestVersion: this.VERSION,
            latestFieldsSchema: CreatedAuditActionService.latestFieldsSchema,
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

    migrateToLatest(data: unknown) {
        // V1-only: validate and return as-is (no migration needed)
        const validated = fieldsSchemaV1.parse(data);
        return { isMigrated: false, latestData: validated };
    }

    async getDisplayTitle({ storedData }: GetDisplayTitleParams): Promise<TranslationWithParams> {
        const { fields } = this.parseStored(storedData);
        const hostUser = fields.hostUserUuid ? await this.deps.userRepository.findByUuid({ uuid: fields.hostUserUuid }) : null;
        const hostName = hostUser?.name || "Unknown";
        if (fields.seatReferenceUid) {
            return { key: "booking_audit_action.created_with_seat", params: { host: hostName } };
        }
        return { key: "booking_audit_action.created", params: { host: hostName } };
    }

    getDisplayJson({
        storedData,
        userTimeZone,
    }: GetDisplayJsonParams): CreatedAuditDisplayData {
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

