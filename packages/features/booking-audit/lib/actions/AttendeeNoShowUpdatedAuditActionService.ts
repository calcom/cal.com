import { z } from "zod";
import type { TFunction } from "next-i18next";

import { BooleanChangeSchema } from "../common/changeSchemas";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService } from "./IAuditActionService";

/**
 * Attendee No-Show Updated Audit Action Service
 * Handles ATTENDEE_NO_SHOW_UPDATED action with per-action versioning
 * 
 * Version History:
 * - v1: Initial schema with noShowAttendee
 */

export const attendeeNoShowUpdatedFieldsSchemaV1 = z.object({
    noShowAttendee: BooleanChangeSchema,
});

// V1 with version wrapper (data schema stored in DB)
export const attendeeNoShowUpdatedDataSchemaV1 = z.object({
    version: z.literal(1),
    fields: attendeeNoShowUpdatedFieldsSchemaV1,
});

// Union of all versions (currently just v1)
export const attendeeNoShowUpdatedDataSchemaAllVersions = attendeeNoShowUpdatedDataSchemaV1;

// Always points to the latest fields schema

export const attendeeNoShowUpdatedFieldsSchema = attendeeNoShowUpdatedFieldsSchemaV1;

export class AttendeeNoShowUpdatedAuditActionService implements IAuditActionService<typeof attendeeNoShowUpdatedFieldsSchemaV1> {
    private helper: AuditActionServiceHelper<typeof attendeeNoShowUpdatedFieldsSchema, typeof attendeeNoShowUpdatedDataSchemaAllVersions>;

    readonly VERSION = 1;
    readonly fieldsSchemaV1 = attendeeNoShowUpdatedFieldsSchemaV1;
    readonly dataSchema = z.object({
        version: z.literal(this.VERSION),
        fields: this.fieldsSchemaV1,
    });

    constructor() {
        this.helper = new AuditActionServiceHelper({
            latestVersion: this.VERSION,
            latestFieldsSchema: attendeeNoShowUpdatedFieldsSchema,
            allVersionsDataSchema: attendeeNoShowUpdatedDataSchemaAllVersions,
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

    getDisplaySummary(storedData: { version: number; fields: z.infer<typeof attendeeNoShowUpdatedFieldsSchemaV1> }, t: TFunction): string {
        return t('audit.attendee_no_show_updated');
    }

    getDisplayDetails(storedData: { version: number; fields: z.infer<typeof attendeeNoShowUpdatedFieldsSchemaV1> }, _t: TFunction): Record<string, string> {
        const { fields } = storedData;
        return {
            'Attendee No-Show': `${fields.noShowAttendee.old ?? false} → ${fields.noShowAttendee.new}`,
        };
    }
}

export type AttendeeNoShowUpdatedAuditData = z.infer<typeof attendeeNoShowUpdatedFieldsSchemaV1>;
