import { z } from "zod";
import type { TFunction } from "next-i18next";

import { ChangeSchema } from "../common/schemas";

/**
 * Status Change Audit Action Helper Service
 * Handles ACCEPTED, PENDING, AWAITING_HOST actions
 */
export class StatusChangeAuditActionHelperService {
    static readonly schema = z.object({
        changes: z.array(ChangeSchema).optional(),
    });

    static createData(params: {
        changes?: Array<{ field: string; oldValue?: unknown; newValue?: unknown }>;
    }): z.infer<typeof this.schema> {
        return params;
    }

    static validate(data: unknown): z.infer<typeof this.schema> {
        return this.schema.parse(data);
    }

    static getDisplaySummary(data: z.infer<typeof this.schema>, t: TFunction): string {
        return t('audit.status_changed');
    }

    static getDisplayDetails(data: z.infer<typeof this.schema>, t: TFunction): Record<string, string> {
        return {};
    }
}

export type StatusChangeAuditData = z.infer<typeof StatusChangeAuditActionHelperService.schema>;

