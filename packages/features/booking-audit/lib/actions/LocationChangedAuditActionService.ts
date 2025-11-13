import { z } from "zod";
import type { TFunction } from "next-i18next";

import { StringChangeSchema } from "../common/changeSchemas";
import type { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService } from "./IAuditActionService";

/**
 * Location Changed Audit Action Service
 * Handles LOCATION_CHANGED action with per-action versioning
 * 
 * Version History:
 * - v1: Initial schema with location
 */

const locationChangedDataSchemaV1 = z.object({
  location: StringChangeSchema,
});

export class LocationChangedAuditActionService implements IAuditActionService<typeof locationChangedDataSchemaV1> {
  private helper: AuditActionServiceHelper;

  readonly VERSION = 1;
  readonly dataSchemaV1 = locationChangedDataSchemaV1;

  constructor(helper: AuditActionServiceHelper) {
    this.helper = helper;
  }

  get schema() {
    return z.object({
      version: z.literal(this.VERSION),
      data: this.dataSchemaV1,
    });
  }

  parse(input: unknown): { version: number; data: z.infer<typeof locationChangedDataSchemaV1> } {
    return this.helper.parse({
      version: this.VERSION,
      dataSchema: this.dataSchemaV1,
      input,
    }) as { version: number; data: z.infer<typeof locationChangedDataSchemaV1> };
  }

  parseStored(data: unknown): { version: number; data: z.infer<typeof locationChangedDataSchemaV1> } {
    return this.helper.parseStored({
      schema: this.schema,
      data,
    }) as { version: number; data: z.infer<typeof locationChangedDataSchemaV1> };
  }

  getVersion(data: unknown): number {
    return this.helper.getVersion(data);
  }

  getDisplaySummary(storedData: { version: number; data: z.infer<typeof locationChangedDataSchemaV1> }, t: TFunction): string {
    return t('audit.location_changed');
  }

  getDisplayDetails(storedData: { version: number; data: z.infer<typeof locationChangedDataSchemaV1> }, t: TFunction): Record<string, string> {
    const { data } = storedData;
    return {
      'Previous Location': data.location.old ?? '-',
      'New Location': data.location.new ?? '-',
    };
  }
}

export type LocationChangedAuditData = z.infer<typeof locationChangedDataSchemaV1>;
