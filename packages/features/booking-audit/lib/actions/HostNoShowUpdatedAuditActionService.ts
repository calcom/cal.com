import { z } from "zod";
import type { TFunction } from "next-i18next";

/**
 * Host no-show updated primary schema
 */
const HostNoShowUpdatedPrimarySchema = z.object({
    /** Host no-show status */
    noShowHost: z.object({
        old: z.boolean().nullable(),
        new: z.boolean(),
    }),
});

export type HostNoShowUpdatedPrimary = z.infer<typeof HostNoShowUpdatedPrimarySchema>;

/**
 * Host No-Show Updated Audit Action Service
 * Handles HOST_NO_SHOW_UPDATED action
 */
export class HostNoShowUpdatedAuditActionService {
    static readonly schema = z.object({
        primary: HostNoShowUpdatedPrimarySchema,
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

