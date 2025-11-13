import { z } from "zod";
import type { TFunction } from "next-i18next";

import { BooleanChangeSchema } from "../common/changeSchemas";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService } from "./IAuditActionService";

/**
 * Host No-Show Updated Audit Action Service
 * Handles HOST_NO_SHOW_UPDATED action with per-action versioning
 * 
 * Version History:
 * - v1: Initial schema with noShowHost
 */

const hostNoShowUpdatedFieldsSchemaV1 = z.object({
    noShowHost: BooleanChangeSchema,
});

export class HostNoShowUpdatedAuditActionService implements IAuditActionService<typeof hostNoShowUpdatedFieldsSchemaV1> {
    private helper: AuditActionServiceHelper<typeof hostNoShowUpdatedFieldsSchemaV1>;

    readonly VERSION = 1;
    readonly fieldsSchemaV1 = hostNoShowUpdatedFieldsSchemaV1;
    readonly dataSchema = z.object({
        version: z.literal(this.VERSION),
        fields: this.fieldsSchemaV1,
    });

    constructor() {
        this.helper = new AuditActionServiceHelper({ fieldsSchema: hostNoShowUpdatedFieldsSchemaV1, version: this.VERSION });
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

    getDisplaySummary(storedData: { version: number; fields: z.infer<typeof hostNoShowUpdatedFieldsSchemaV1> }, t: TFunction): string {
        return t('audit.host_no_show_updated');
    }

    getDisplayDetails(storedData: { version: number; fields: z.infer<typeof hostNoShowUpdatedFieldsSchemaV1> }, t: TFunction): Record<string, string> {
        const { fields } = storedData;
        return {
            'Host No-Show': `${fields.noShowHost.old ?? false} → ${fields.noShowHost.new}`,
        };
    }
}

export type HostNoShowUpdatedAuditData = z.infer<typeof hostNoShowUpdatedFieldsSchemaV1>;
