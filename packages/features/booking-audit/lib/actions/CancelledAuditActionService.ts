import { z } from "zod";
import type { TFunction } from "next-i18next";

import { StringChangeSchema } from "../common/changeSchemas";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService } from "./IAuditActionService";

/**
 * Cancelled Audit Action Service
 * Handles CANCELLED action with per-action versioning
 * 
 * Version History:
 * - v1: Initial schema with cancellationReason, cancelledBy, status
 */

const cancelledDataSchemaV1 = z.object({
    cancellationReason: StringChangeSchema,
    cancelledBy: StringChangeSchema,
    status: StringChangeSchema,
});

export class CancelledAuditActionService implements IAuditActionService<typeof cancelledDataSchemaV1> {
    private helper: AuditActionServiceHelper<typeof cancelledDataSchemaV1>;

    readonly VERSION = 1;
    readonly dataSchemaV1 = cancelledDataSchemaV1;
    readonly schema = z.object({
        version: z.literal(this.VERSION),
        data: this.dataSchemaV1,
    });

    constructor() {
        this.helper = new AuditActionServiceHelper({ dataSchema: cancelledDataSchemaV1, version: this.VERSION });
    }

    parse(input: unknown) {
        return this.helper.parse(input);
    }

    parseStored(data: unknown) {
        return this.helper.parseStored(data);
    }

    getVersion(data: unknown): number {
        return this.helper.getVersion(data);
    }

    getDisplaySummary(storedData: { version: number; data: z.infer<typeof cancelledDataSchemaV1> }, t: TFunction): string {
        return t('audit.cancelled_booking');
    }

    getDisplayDetails(storedData: z.infer<typeof this.schema>): Record<string, string> {
        const { data } = storedData;
        return {
            'Cancellation Reason': data.cancellationReason.new ?? '-',
            'Previous Reason': data.cancellationReason.old ?? '-',
            'Cancelled By': `${data.cancelledBy.old ?? '-'} → ${data.cancelledBy.new ?? '-'}`,
        };
    }
}

export type CancelledAuditData = z.infer<typeof cancelledDataSchemaV1>;
