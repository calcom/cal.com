import { z } from "zod";
import type { TFunction } from "next-i18next";

import { ChangeSchema } from "../common/schemas";

/**
 * Location Changed Audit Action Helper Service
 * Handles LOCATION_CHANGED action
 */
export class LocationChangedAuditActionHelperService {
    static readonly schema = z.object({
        changes: z.array(ChangeSchema),
    });

    static createData(params: {
        changes: Array<{ field: string; oldValue?: unknown; newValue?: unknown }>;
    }): z.infer<typeof this.schema> {
        return params;
    }

    static validate(data: unknown): z.infer<typeof this.schema> {
        return this.schema.parse(data);
    }

    static getDisplaySummary(data: z.infer<typeof this.schema>, t: TFunction): string {
        return t('audit.location_changed');
    }

    static getDisplayDetails(data: z.infer<typeof this.schema>, t: TFunction): Record<string, string> {
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

export type LocationChangedAuditData = z.infer<typeof LocationChangedAuditActionHelperService.schema>;

