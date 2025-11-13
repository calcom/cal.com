import { z } from "zod";
import type { TFunction } from "next-i18next";

import { StringChangeSchema } from "../common/changeSchemas";
import type { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService } from "./IAuditActionService";

/**
 * Rejected Audit Action Service
 * Handles REJECTED action with per-action versioning
 * 
 * Version History:
 * - v1: Initial schema with rejectionReason, status
 */

const rejectedDataSchemaV1 = z.object({
    rejectionReason: StringChangeSchema,
    status: StringChangeSchema,
});

export class RejectedAuditActionService implements IAuditActionService<typeof rejectedDataSchemaV1> {
    private helper: AuditActionServiceHelper;

    readonly VERSION = 1;
    readonly dataSchemaV1 = rejectedDataSchemaV1;

    constructor(helper: AuditActionServiceHelper) {
        this.helper = helper;
    }

    get schema() {
        return z.object({
            version: z.literal(this.VERSION),
            data: this.dataSchemaV1,
        });
    }

    parse(input: unknown): { version: number; data: z.infer<typeof rejectedDataSchemaV1> } {
        return this.helper.parse({
            version: this.VERSION,
            dataSchema: this.dataSchemaV1,
            input,
        }) as { version: number; data: z.infer<typeof rejectedDataSchemaV1> };
    }

    parseStored(data: unknown): { version: number; data: z.infer<typeof rejectedDataSchemaV1> } {
        return this.helper.parseStored({
            schema: this.schema,
            data,
        }) as { version: number; data: z.infer<typeof rejectedDataSchemaV1> };
    }

    getVersion(data: unknown): number {
        return this.helper.getVersion(data);
    }

    getDisplaySummary(storedData: { version: number; data: z.infer<typeof rejectedDataSchemaV1> }, t: TFunction): string {
        return t('audit.rejected_booking');
    }

    getDisplayDetails(storedData: { version: number; data: z.infer<typeof rejectedDataSchemaV1> }, _t: TFunction): Record<string, string> {
        const { data } = storedData;
        return {
            'Rejection Reason': data.rejectionReason.new ?? '-',
            'Previous Reason': data.rejectionReason.old ?? '-',
        };
    }
}

export type RejectedAuditData = z.infer<typeof rejectedDataSchemaV1>;
