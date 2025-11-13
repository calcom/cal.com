import { z } from "zod";
import type { TFunction } from "next-i18next";

import { StringArrayChangeSchema } from "../common/changeSchemas";
import type { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService } from "./IAuditActionService";

/**
 * Attendee Removed Audit Action Service
 * Handles ATTENDEE_REMOVED action with per-action versioning
 * 
 * Version History:
 * - v1: Initial schema with removedAttendees
 */

const attendeeRemovedDataSchemaV1 = z.object({
    removedAttendees: StringArrayChangeSchema,
});

export class AttendeeRemovedAuditActionService implements IAuditActionService<typeof attendeeRemovedDataSchemaV1> {
    private helper: AuditActionServiceHelper;

    readonly VERSION = 1;
    readonly dataSchemaV1 = attendeeRemovedDataSchemaV1;

    constructor(helper: AuditActionServiceHelper) {
        this.helper = helper;
    }

    get schema() {
        return z.object({
            version: z.literal(this.VERSION),
            data: this.dataSchemaV1,
        });
    }

    parse(input: unknown): { version: number; data: z.infer<typeof attendeeRemovedDataSchemaV1> } {
        return this.helper.parse({
            version: this.VERSION,
            dataSchema: this.dataSchemaV1,
            input,
        }) as { version: number; data: z.infer<typeof attendeeRemovedDataSchemaV1> };
    }

    parseStored(data: unknown): { version: number; data: z.infer<typeof attendeeRemovedDataSchemaV1> } {
        return this.helper.parseStored({
            schema: this.schema,
            data,
        }) as { version: number; data: z.infer<typeof attendeeRemovedDataSchemaV1> };
    }

    getVersion(data: unknown): number {
        return this.helper.getVersion(data);
    }

    getDisplaySummary(storedData: { version: number; data: z.infer<typeof attendeeRemovedDataSchemaV1> }, t: TFunction): string {
        const { data } = storedData;
        return t('audit.removed_guests', { count: data.removedAttendees.new.length });
    }

    getDisplayDetails(storedData: { version: number; data: z.infer<typeof attendeeRemovedDataSchemaV1> }, _t: TFunction): Record<string, string> {
        const { data } = storedData;
        return {
            'Removed Guests': data.removedAttendees.new.join(', '),
            'Count': data.removedAttendees.new.length.toString(),
        };
    }
}

export type AttendeeRemovedAuditData = z.infer<typeof attendeeRemovedDataSchemaV1>;
