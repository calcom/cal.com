import { z } from "zod";
import type { TFunction } from "next-i18next";

import { StringArrayChangeSchema } from "../common/changeSchemas";
import type { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService } from "./IAuditActionService";

/**
 * Attendee Added Audit Action Service
 * Handles ATTENDEE_ADDED action with per-action versioning
 * 
 * Version History:
 * - v1: Initial schema with addedAttendees
 */

const attendeeAddedDataSchemaV1 = z.object({
    addedAttendees: StringArrayChangeSchema,
});

export class AttendeeAddedAuditActionService implements IAuditActionService<typeof attendeeAddedDataSchemaV1> {
    private helper: AuditActionServiceHelper;

    readonly VERSION = 1;
    readonly dataSchemaV1 = attendeeAddedDataSchemaV1;

    constructor(helper: AuditActionServiceHelper) {
        this.helper = helper;
    }

    get schema() {
        return z.object({
            version: z.literal(this.VERSION),
            data: this.dataSchemaV1,
        });
    }

    parse(input: unknown): { version: number; data: z.infer<typeof attendeeAddedDataSchemaV1> } {
        return this.helper.parse({
            version: this.VERSION,
            dataSchema: this.dataSchemaV1,
            input,
        }) as { version: number; data: z.infer<typeof attendeeAddedDataSchemaV1> };
    }

    parseStored(data: unknown): { version: number; data: z.infer<typeof attendeeAddedDataSchemaV1> } {
        return this.helper.parseStored({
            schema: this.schema,
            data,
        }) as { version: number; data: z.infer<typeof attendeeAddedDataSchemaV1> };
    }

    getVersion(data: unknown): number {
        return this.helper.getVersion(data);
    }

    getDisplaySummary(storedData: { version: number; data: z.infer<typeof attendeeAddedDataSchemaV1> }, t: TFunction): string {
        const { data } = storedData;
        return t('audit.added_guests', { count: data.addedAttendees.new.length });
    }

    getDisplayDetails(storedData: { version: number; data: z.infer<typeof attendeeAddedDataSchemaV1> }, _t: TFunction): Record<string, string> {
        const { data } = storedData;
        return {
            'Added Guests': data.addedAttendees.new.join(', '),
            'Count': data.addedAttendees.new.length.toString(),
        };
    }
}

export type AttendeeAddedAuditData = z.infer<typeof attendeeAddedDataSchemaV1>;
