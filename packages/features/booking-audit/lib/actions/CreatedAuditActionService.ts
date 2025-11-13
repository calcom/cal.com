import { z } from "zod";
import type { TFunction } from "next-i18next";
import dayjs from "@calcom/dayjs";
import { BookingStatus } from "@calcom/prisma/enums";

import type { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService } from "./IAuditActionService";

/**
 * Created Audit Action Service
 * Handles RECORD_CREATED action with per-action versioning
 * 
 * Note: CREATED action captures initial state, so it doesn't use { old, new } pattern
 * 
 * Version History:
 * - v1: Initial schema with startTime, endTime, status
 */

const createdDataSchemaV1 = z.object({
    startTime: z.string(),
    endTime: z.string(),
    status: z.nativeEnum(BookingStatus),
});

export class CreatedAuditActionService implements IAuditActionService<typeof createdDataSchemaV1> {
    private helper: AuditActionServiceHelper;

    readonly VERSION = 1;
    readonly dataSchemaV1 = createdDataSchemaV1;

    constructor(helper: AuditActionServiceHelper) {
        this.helper = helper;
    }

    get schema() {
        return z.object({
            version: z.literal(this.VERSION),
            data: this.dataSchemaV1,
        });
    }

    parse(input: unknown) {
        return this.helper.parse({
            version: this.VERSION,
            dataSchema: this.dataSchemaV1,
            input,
        }) as { version: number; data: z.infer<typeof createdDataSchemaV1> };
    }

    parseStored(data: unknown) {
        return this.helper.parseStored({
            schema: this.schema,
            data,
        }) as { version: number; data: z.infer<typeof createdDataSchemaV1> };
    }

    getVersion(data: unknown): number {
        return this.helper.getVersion(data);
    }

    getDisplaySummary(storedData: { version: number; data: z.infer<typeof createdDataSchemaV1> }, t: TFunction): string {
        return t('audit.booking_created');
    }

    getDisplayDetails(storedData, t): Record<string, string> {
        const { data } = storedData;
        return {
            'Start Time': dayjs(data.startTime).format('MMM D, YYYY h:mm A'),
            'End Time': dayjs(data.endTime).format('MMM D, YYYY h:mm A'),
            'Initial Status': data.status,
        };
    }
}

export type CreatedAuditData = z.infer<typeof createdDataSchemaV1>;
