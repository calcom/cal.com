import { z } from "zod";
import type { TFunction } from "next-i18next";

import { StringArrayChangeSchema } from "../common/changeSchemas";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService } from "./IAuditActionService";

/**
 * Attendee Removed Audit Action Service
 * Handles ATTENDEE_REMOVED action with per-action versioning
 * 
 * Version History:
 * - v1: Initial schema with removedAttendees
 */

export const attendeeRemovedFieldsSchemaV1 = z.object({
    removedAttendees: StringArrayChangeSchema,
});

// V1 with version wrapper (data schema stored in DB)
export const attendeeRemovedDataSchemaV1 = z.object({
    version: z.literal(1),
    fields: attendeeRemovedFieldsSchemaV1,
});

// Union of all versions (currently just v1)
export const attendeeRemovedDataSchemaAllVersions = attendeeRemovedDataSchemaV1;

// Always points to the latest fields schema
export const attendeeRemovedFieldsSchema = attendeeRemovedFieldsSchemaV1;

export class AttendeeRemovedAuditActionService implements IAuditActionService<typeof attendeeRemovedFieldsSchemaV1> {
    private helper: AuditActionServiceHelper<typeof attendeeRemovedFieldsSchema, typeof attendeeRemovedDataSchemaAllVersions>;

    readonly VERSION = 1;
    readonly fieldsSchemaV1 = attendeeRemovedFieldsSchemaV1;
    readonly dataSchema = z.object({
        version: z.literal(this.VERSION),
        fields: this.fieldsSchemaV1,
    });

    constructor() {
        this.helper = new AuditActionServiceHelper({
            latestVersion: this.VERSION,
            latestFieldsSchema: attendeeRemovedFieldsSchema,
            allVersionsDataSchema: attendeeRemovedDataSchemaAllVersions,
        });
    }

    parseFieldsWithLatest(input: unknown) {
        return this.helper.parseFieldsWithLatest(input);
    }

    parseStored(data: unknown) {
        return this.helper.parseStored(data);
    }

    getVersion(data: unknown): number {
        return this.helper.getVersion(data);
    }

    migrateToLatest(data: unknown) {
        // V1-only: validate and return as-is (no migration needed)
        const validated = this.fieldsSchemaV1.parse(data);
        return { isMigrated: false, latestData: validated };
    }

    getDisplaySummary(storedData: { version: number; fields: z.infer<typeof attendeeRemovedFieldsSchemaV1> }, t: TFunction): string {
        const { fields } = storedData;
        return t('audit.removed_guests', { count: fields.removedAttendees.new.length });
    }

    getDisplayDetails(storedData: { version: number; fields: z.infer<typeof attendeeRemovedFieldsSchemaV1> }, _t: TFunction): Record<string, string> {
        const { fields } = storedData;
        return {
            'Removed Guests': fields.removedAttendees.new.join(', '),
            'Count': fields.removedAttendees.new.length.toString(),
        };
    }
}

export type AttendeeRemovedAuditData = z.infer<typeof attendeeRemovedFieldsSchemaV1>;
