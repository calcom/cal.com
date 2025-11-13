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

const attendeeNoShowUpdatedFieldsSchemaV1 = z.object({
    noShowAttendee: BooleanChangeSchema,
});

export class AttendeeNoShowUpdatedAuditActionService implements IAuditActionService<typeof attendeeNoShowUpdatedFieldsSchemaV1> {
    private helper: AuditActionServiceHelper<typeof attendeeNoShowUpdatedFieldsSchemaV1>;

    readonly VERSION = 1;
    readonly fieldsSchemaV1 = attendeeNoShowUpdatedFieldsSchemaV1;
    readonly dataSchema = z.object({
        version: z.literal(this.VERSION),
        fields: this.fieldsSchemaV1,
    });

    constructor() {
        this.helper = new AuditActionServiceHelper({ fieldsSchema: attendeeNoShowUpdatedFieldsSchemaV1, version: this.VERSION });
    }

    parseFields(input: unknown) {
        return this.helper.parseFields(input);
    }

    parseStored(data: unknown) {
        return this.helper.parseStored(data);
    }

    getVersion(data: unknown): number {
        return this.helper.getVersion(data);
    }

    getDisplaySummary(storedData: { version: number; fields: z.infer<typeof attendeeNoShowUpdatedFieldsSchemaV1> }, t: TFunction): string {
        return t('audit.attendee_no_show_updated');
    }

    getDisplayDetails(storedData: { version: number; fields: z.infer<typeof attendeeNoShowUpdatedFieldsSchemaV1> }, t: TFunction): Record<string, string> {
        const { fields } = storedData;
        return {
            'Attendee No-Show': `${fields.noShowAttendee.old ?? false} → ${fields.noShowAttendee.new}`,
        };
    }
}

export type AttendeeNoShowUpdatedAuditData = z.infer<typeof attendeeNoShowUpdatedFieldsSchemaV1>;
