import { z } from "zod";

import { getHumanReadableLocationValue } from "@calcom/app-store/locations";
import { StringChangeSchema } from "../common/changeSchemas";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService, TranslationWithParams, GetDisplayTitleParams } from "./IAuditActionService";
import { getTranslation } from "@calcom/lib/server/i18n";
/**
 * Location Changed Audit Action Service
 * Handles LOCATION_CHANGED action with per-action versioning
 */

// Module-level because it is passed to IAuditActionService type outside the class scope
const fieldsSchemaV1 = z.object({
    location: StringChangeSchema,
});

export class LocationChangedAuditActionService implements IAuditActionService {
    readonly VERSION = 1;
    public static readonly TYPE = "LOCATION_CHANGED" as const;
    private static dataSchemaV1 = z.object({
        version: z.literal(1),
        fields: fieldsSchemaV1,
    });
    private static fieldsSchemaV1 = fieldsSchemaV1;
    public static readonly latestFieldsSchema = fieldsSchemaV1;
    // Union of all versions
    public static readonly storedDataSchema = LocationChangedAuditActionService.dataSchemaV1;
    // Union of all versions
    public static readonly storedFieldsSchema = LocationChangedAuditActionService.fieldsSchemaV1;
    private helper: AuditActionServiceHelper<
        typeof LocationChangedAuditActionService.latestFieldsSchema,
        typeof LocationChangedAuditActionService.storedDataSchema
    >;

    constructor() {
        this.helper = new AuditActionServiceHelper({
            latestVersion: this.VERSION,
            latestFieldsSchema: LocationChangedAuditActionService.latestFieldsSchema,
            storedDataSchema: LocationChangedAuditActionService.storedDataSchema,
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
        // TODO: Ideally we want to translate the location label to the user's locale
        // We currently don't accept requesting user's translate fn here, fix it later.
        const t = await getTranslation("en", "common");

        const fromLocation = getHumanReadableLocationValue(fields.location.old, t);
        const toLocation = getHumanReadableLocationValue(fields.location.new, t);

        return {
            key: "booking_audit_action.location_changed_from_to",
            params: { fromLocation, toLocation },
        };
    }
}

export type LocationChangedAuditData = z.infer<typeof fieldsSchemaV1>;
