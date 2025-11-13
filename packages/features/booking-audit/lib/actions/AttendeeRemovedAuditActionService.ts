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

const attendeeRemovedFieldsSchemaV1 = z.object({
    removedAttendees: StringArrayChangeSchema,
});

export class AttendeeRemovedAuditActionService implements IAuditActionService<typeof attendeeRemovedFieldsSchemaV1> {
    private helper: AuditActionServiceHelper<typeof attendeeRemovedFieldsSchemaV1>;

    readonly VERSION = 1;
    readonly fieldsSchemaV1 = attendeeRemovedFieldsSchemaV1;
    readonly dataSchema = z.object({
        version: z.literal(this.VERSION),
        fields: this.fieldsSchemaV1,
    });

    constructor() {
        this.helper = new AuditActionServiceHelper({ fieldsSchema: attendeeRemovedFieldsSchemaV1, version: this.VERSION });
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
