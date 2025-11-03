import { z } from "zod";
import type { TFunction } from "next-i18next";

import { StringChangeSchema } from "../common/changeSchemas";

/**
 * Location Changed Audit Action Service
 * Handles LOCATION_CHANGED action
 */
export class LocationChangedAuditActionService {
    static readonly schema = z.object({
        primary: z.object({
            location: StringChangeSchema,
        }),
    });

    parse(data: unknown): z.infer<typeof LocationChangedAuditActionService.schema> {
        return LocationChangedAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof LocationChangedAuditActionService.schema>, t: TFunction): string {
        return t('audit.location_changed');
    }

    getDisplayDetails(data: z.infer<typeof LocationChangedAuditActionService.schema>, t: TFunction): Record<string, string> {
        return {
            'Previous Location': data.primary.location.old ?? '-',
            'New Location': data.primary.location.new ?? '-',
        };
    }
}

export type LocationChangedAuditData = z.infer<typeof LocationChangedAuditActionService.schema>;

