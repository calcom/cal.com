import { z } from "zod";
import type { TFunction } from "next-i18next";

import { BooleanChangeSchema } from "../common/changeSchemas";
import type { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService } from "./IAuditActionService";

/**
 * Host No-Show Updated Audit Action Service
 * Handles HOST_NO_SHOW_UPDATED action with per-action versioning
 * 
 * Version History:
 * - v1: Initial schema with noShowHost
 */

const hostNoShowUpdatedDataSchemaV1 = z.object({
    noShowHost: BooleanChangeSchema,
});

export class HostNoShowUpdatedAuditActionService implements IAuditActionService<typeof hostNoShowUpdatedDataSchemaV1> {
    private helper: AuditActionServiceHelper;

    readonly VERSION = 1;
    readonly dataSchemaV1 = hostNoShowUpdatedDataSchemaV1;

    constructor(helper: AuditActionServiceHelper) {
        this.helper = helper;
    }

    get schema() {
        return z.object({
            version: z.literal(this.VERSION),
            data: this.dataSchemaV1,
        });
    }

    parse(input: unknown): { version: number; data: z.infer<typeof hostNoShowUpdatedDataSchemaV1> } {
        return this.helper.parse({
            version: this.VERSION,
            dataSchema: this.dataSchemaV1,
            input,
        }) as { version: number; data: z.infer<typeof hostNoShowUpdatedDataSchemaV1> };
    }

    parseStored(data: unknown): { version: number; data: z.infer<typeof hostNoShowUpdatedDataSchemaV1> } {
        return this.helper.parseStored({
            schema: this.schema,
            data,
        }) as { version: number; data: z.infer<typeof hostNoShowUpdatedDataSchemaV1> };
    }

    getVersion(data: unknown): number {
        return this.helper.getVersion(data);
    }

    getDisplaySummary(storedData: { version: number; data: z.infer<typeof hostNoShowUpdatedDataSchemaV1> }, t: TFunction): string {
        return t('audit.host_no_show_updated');
    }

    getDisplayDetails(storedData: { version: number; data: z.infer<typeof hostNoShowUpdatedDataSchemaV1> }, t: TFunction): Record<string, string> {
        const { data } = storedData;
        return {
            'Host No-Show': `${data.noShowHost.old ?? false} → ${data.noShowHost.new}`,
        };
    }
}

export type HostNoShowUpdatedAuditData = z.infer<typeof hostNoShowUpdatedDataSchemaV1>;
