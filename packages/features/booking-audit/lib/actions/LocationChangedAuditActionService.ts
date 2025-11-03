import { z } from "zod";
import type { TFunction } from "next-i18next";

/**
 * Location changed primary schema
 */
const LocationChangedPrimarySchema = z.object({
    /** Booking location update */
    location: z.object({
        old: z.string().nullable(),
        new: z.string().nullable(),
    }),
});

export type LocationChangedPrimary = z.infer<typeof LocationChangedPrimarySchema>;

/**
 * Location Changed Audit Action Service
 * Handles LOCATION_CHANGED action
 */
export class LocationChangedAuditActionService {
    static readonly schema = z.object({
        primary: LocationChangedPrimarySchema,
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

