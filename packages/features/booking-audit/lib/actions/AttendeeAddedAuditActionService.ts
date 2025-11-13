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

const attendeeAddedFieldsSchemaV1 = z.object({
    addedAttendees: StringArrayChangeSchema,
});

export class AttendeeAddedAuditActionService implements IAuditActionService<typeof attendeeAddedFieldsSchemaV1> {
    private helper: AuditActionServiceHelper<typeof attendeeAddedFieldsSchemaV1>;

    readonly VERSION = 1;
    readonly fieldsSchemaV1 = attendeeAddedFieldsSchemaV1;
    readonly dataSchema = z.object({
        version: z.literal(this.VERSION),
        fields: this.fieldsSchemaV1,
    });

    constructor() {
        this.helper = new AuditActionServiceHelper({ fieldsSchema: attendeeAddedFieldsSchemaV1, version: this.VERSION });
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
