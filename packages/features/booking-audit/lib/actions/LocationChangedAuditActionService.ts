import { z } from "zod";
import type { TFunction } from "next-i18next";

/**
 * Location changed change schema
 */
const LocationChangedChangeSchema = z.object({
    /** Booking location update */
    location: z.object({
        old: z.string().nullish(),
        new: z.string().nullish(),
    }),
});

export type LocationChangedChange = z.infer<typeof LocationChangedChangeSchema>;

/**
 * Location Changed Audit Action Service
 * Handles LOCATION_CHANGED action
 */
export class LocationChangedAuditActionService {
    static readonly schema = z.object({
        changes: LocationChangedChangeSchema,
    });

    parse(data: unknown): z.infer<typeof LocationChangedAuditActionService.schema> {
        return LocationChangedAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof LocationChangedAuditActionService.schema>, t: TFunction): string {
        return t('audit.location_changed');
    }

    getDisplayDetails(data: z.infer<typeof LocationChangedAuditActionService.schema>, t: TFunction): Record<string, string> {
        return {
            'Old Location': data.changes.location.old ?? '-',
            'New Location': data.changes.location.new ?? '-',
        };
    }
}

export type LocationChangedAuditData = z.infer<typeof LocationChangedAuditActionService.schema>;

