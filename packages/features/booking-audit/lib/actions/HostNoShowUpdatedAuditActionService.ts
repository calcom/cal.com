import { z } from "zod";
import type { TFunction } from "next-i18next";

import { BooleanChangeSchema } from "../common/changeSchemas";

/**
 * Host No-Show Updated Audit Action Service
 * Handles HOST_NO_SHOW_UPDATED action
 */
export class HostNoShowUpdatedAuditActionService {
    static readonly schema = z.object({
        primary: z.object({
            noShowHost: BooleanChangeSchema,
        }),
    });

    parse(data: unknown): z.infer<typeof HostNoShowUpdatedAuditActionService.schema> {
        return HostNoShowUpdatedAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof HostNoShowUpdatedAuditActionService.schema>, t: TFunction): string {
        return t('audit.host_no_show_updated');
    }

    getDisplayDetails(data: z.infer<typeof HostNoShowUpdatedAuditActionService.schema>, t: TFunction): Record<string, string> {
        return {
            'Host No-Show': `${data.primary.noShowHost.old ?? false} → ${data.primary.noShowHost.new}`,
        };
    }
}

export type HostNoShowUpdatedAuditData = z.infer<typeof HostNoShowUpdatedAuditActionService.schema>;

