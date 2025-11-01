import { z } from "zod";
import type { TFunction } from "next-i18next";

import { ChangeSchema } from "../common/schemas";

/**
 * Location Changed Audit Action Service
 * Handles LOCATION_CHANGED action
 */
export class LocationChangedAuditActionService {
    static readonly schema = z.object({
        changes: z.array(ChangeSchema),
    });

    parse(data: unknown): z.infer<typeof LocationChangedAuditActionService.schema> {
        return LocationChangedAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof LocationChangedAuditActionService.schema>, t: TFunction): string {
        return t('audit.location_changed');
    }

    getDisplayDetails(data: z.infer<typeof LocationChangedAuditActionService.schema>, t: TFunction): Record<string, string> {
        const locationChange = data.changes.find(c => c.field === 'location');
        if (locationChange) {
            return {
                'Old Location': String(locationChange.oldValue || '-'),
                'New Location': String(locationChange.newValue || '-'),
            };
        }
        return {};
    }
}

export type LocationChangedAuditData = z.infer<typeof LocationChangedAuditActionService.schema>;

