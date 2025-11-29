import { z } from "zod";
import type { TFunction } from "next-i18next";

import { StringArrayChangeSchema } from "../common/changeSchemas";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService } from "./IAuditActionService";

/**
 * Attendee Added Audit Action Service
 * Handles ATTENDEE_ADDED action with per-action versioning
 * 
 * Version History:
 * - v1: Initial schema with addedAttendees
 */

export const attendeeAddedFieldsSchemaV1 = z.object({
    addedAttendees: StringArrayChangeSchema,
});

// V1 with version wrapper (data schema stored in DB)
export const attendeeAddedDataSchemaV1 = z.object({
    version: z.literal(1),
    fields: attendeeAddedFieldsSchemaV1,
});

// Union of all versions (currently just v1)
export const attendeeAddedDataSchemaAllVersions = attendeeAddedDataSchemaV1;

// Always points to the latest fields schema

export const attendeeAddedFieldsSchema = attendeeAddedFieldsSchemaV1;

export class AttendeeAddedAuditActionService implements IAuditActionService<typeof attendeeAddedFieldsSchemaV1> {
    private helper: AuditActionServiceHelper<typeof attendeeAddedFieldsSchema, typeof attendeeAddedDataSchemaAllVersions>;

    readonly VERSION = 1;
    readonly fieldsSchemaV1 = attendeeAddedFieldsSchemaV1;
    readonly dataSchema = z.object({
        version: z.literal(this.VERSION),
        fields: this.fieldsSchemaV1,
    });

    constructor() {
        this.helper = new AuditActionServiceHelper({
            latestVersion: this.VERSION,
            latestFieldsSchema: attendeeAddedFieldsSchema,
            allVersionsDataSchema: attendeeAddedDataSchemaAllVersions,
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

    getDisplaySummary(storedData: { version: number; fields: z.infer<typeof attendeeAddedFieldsSchemaV1> }, t: TFunction): string {
        const { fields } = storedData;
        return t('audit.added_guests', { count: fields.addedAttendees.new.length });
    }

    getDisplayDetails(storedData: { version: number; fields: z.infer<typeof attendeeAddedFieldsSchemaV1> }, _t: TFunction): Record<string, string> {
        const { fields } = storedData;
        return {
            'Added Guests': fields.addedAttendees.new.join(', '),
            'Count': fields.addedAttendees.new.length.toString(),
        };
    }
}

export type AttendeeAddedAuditData = z.infer<typeof attendeeAddedFieldsSchemaV1>;
