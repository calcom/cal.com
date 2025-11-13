import { z } from "zod";
import type { TFunction } from "next-i18next";

import { BooleanChangeSchema } from "../common/changeSchemas";
import type { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService } from "./IAuditActionService";

/**
 * Attendee No-Show Updated Audit Action Service
 * Handles ATTENDEE_NO_SHOW_UPDATED action with per-action versioning
 * 
 * Version History:
 * - v1: Initial schema with noShowAttendee
 */

const attendeeNoShowUpdatedDataSchemaV1 = z.object({
    noShowAttendee: BooleanChangeSchema,
});

export class AttendeeNoShowUpdatedAuditActionService implements IAuditActionService<typeof attendeeNoShowUpdatedDataSchemaV1> {
    private helper: AuditActionServiceHelper;

    readonly VERSION = 1;
    readonly dataSchemaV1 = attendeeNoShowUpdatedDataSchemaV1;

    constructor(helper: AuditActionServiceHelper) {
        this.helper = helper;
    }

    get schema() {
        return z.object({
            version: z.literal(this.VERSION),
            data: this.dataSchemaV1,
        });
    }

    parse(input: unknown): { version: number; data: z.infer<typeof attendeeNoShowUpdatedDataSchemaV1> } {
        return this.helper.parse({
            version: this.VERSION,
            dataSchema: this.dataSchemaV1,
            input,
        }) as { version: number; data: z.infer<typeof attendeeNoShowUpdatedDataSchemaV1> };
    }

    parseStored(data: unknown): { version: number; data: z.infer<typeof attendeeNoShowUpdatedDataSchemaV1> } {
        return this.helper.parseStored({
            schema: this.schema,
            data,
        }) as { version: number; data: z.infer<typeof attendeeNoShowUpdatedDataSchemaV1> };
    }

    getVersion(data: unknown): number {
        return this.helper.getVersion(data);
    }

    getDisplaySummary(storedData: { version: number; data: z.infer<typeof attendeeNoShowUpdatedDataSchemaV1> }, t: TFunction): string {
        return t('audit.attendee_no_show_updated');
    }

    getDisplayDetails(storedData: { version: number; data: z.infer<typeof attendeeNoShowUpdatedDataSchemaV1> }, t: TFunction): Record<string, string> {
        const { data } = storedData;
        return {
            'Attendee No-Show': `${data.noShowAttendee.old ?? false} → ${data.noShowAttendee.new}`,
        };
    }
}

export type AttendeeNoShowUpdatedAuditData = z.infer<typeof attendeeNoShowUpdatedDataSchemaV1>;
