import { z } from "zod";
import type { TFunction } from "next-i18next";

import { StringChangeSchema } from "../common/changeSchemas";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService } from "./IAuditActionService";

/**
 * Location Changed Audit Action Service
 * Handles LOCATION_CHANGED action with per-action versioning
 * 
 * Version History:
 * - v1: Initial schema with location
 */

export const locationChangedFieldsSchemaV1 = z.object({
  location: StringChangeSchema,
});

// V1 with version wrapper (data schema stored in DB)
export const locationChangedDataSchemaV1 = z.object({
    version: z.literal(1),
    fields: locationChangedFieldsSchemaV1,
});

// Union of all versions (currently just v1)
export const locationChangedDataSchemaAllVersions = locationChangedDataSchemaV1;

// Always points to the latest fields schema

export const locationChangedFieldsSchema = locationChangedFieldsSchemaV1;

export class LocationChangedAuditActionService implements IAuditActionService<typeof locationChangedFieldsSchemaV1> {
  private helper: AuditActionServiceHelper<typeof locationChangedFieldsSchema, typeof locationChangedDataSchemaAllVersions>;

  readonly VERSION = 1;
  readonly fieldsSchemaV1 = locationChangedFieldsSchemaV1;
  readonly dataSchema = z.object({
    version: z.literal(this.VERSION),
    fields: this.fieldsSchemaV1,
  });

  constructor() {
    this.helper = new AuditActionServiceHelper({
            latestVersion: this.VERSION,
            latestFieldsSchema: locationChangedFieldsSchema,
            allVersionsDataSchema: locationChangedDataSchemaAllVersions,
        });
  }

  parseFieldsWithLatest(input: unknown) {
    return this.helper.parseFieldsWithLatest(input);
  }

  parseStored(data: unknown) {
    return this.helper.parseStored(data);
  }

    getVersion(data: unknown): number {
        return this.helper.getVersion(data);
    }

    migrateToLatest(data: unknown) {
        // V1-only: validate and return as-is (no migration needed)
        const validated = this.fieldsSchemaV1.parse(data);
        return { isMigrated: false, latestData: validated };
    }

    getDisplaySummary(storedData: { version: number; fields: z.infer<typeof locationChangedFieldsSchemaV1> }, t: TFunction): string {
    return t('audit.location_changed');
  }

    getDisplayDetails(storedData: { version: number; fields: z.infer<typeof locationChangedFieldsSchemaV1> }, _t: TFunction): Record<string, string> {
    const { fields } = storedData;
    return {
      'Previous Location': fields.location.old ?? '-',
      'New Location': fields.location.new ?? '-',
    };
  }
}

export type LocationChangedAuditData = z.infer<typeof locationChangedFieldsSchemaV1>;
