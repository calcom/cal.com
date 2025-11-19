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

const locationChangedFieldsSchemaV1 = z.object({
  location: StringChangeSchema,
});

export class LocationChangedAuditActionService implements IAuditActionService<typeof locationChangedFieldsSchemaV1> {
  private helper: AuditActionServiceHelper<typeof locationChangedFieldsSchemaV1>;

  readonly VERSION = 1;
  readonly fieldsSchemaV1 = locationChangedFieldsSchemaV1;
  readonly dataSchema = z.object({
    version: z.literal(this.VERSION),
    fields: this.fieldsSchemaV1,
  });

  constructor() {
    this.helper = new AuditActionServiceHelper({ fieldsSchema: locationChangedFieldsSchemaV1, version: this.VERSION });
  }

  parseFields(input: unknown) {
    return this.helper.parseFields(input);
  }

  parseStored(data: unknown) {
    return this.helper.parseStored(data);
  }

  getVersion(data: unknown): number {
    return this.helper.getVersion(data);
  }

  getDisplaySummary(storedData: { version: number; fields: z.infer<typeof locationChangedFieldsSchemaV1> }, t: TFunction): string {
    return t('audit.location_changed');
  }

  getDisplayDetails(storedData: { version: number; fields: z.infer<typeof locationChangedFieldsSchemaV1> }, t: TFunction): Record<string, string> {
    const { fields } = storedData;
    return {
      'Previous Location': fields.location.old ?? '-',
      'New Location': fields.location.new ?? '-',
    };
  }
}

export type LocationChangedAuditData = z.infer<typeof locationChangedFieldsSchemaV1>;
