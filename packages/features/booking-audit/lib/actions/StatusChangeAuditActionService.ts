import { z } from "zod";
import type { TFunction } from "next-i18next";

import { StringChangeSchema } from "../common/changeSchemas";
import type { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService } from "./IAuditActionService";

/**
 * Status Change Audit Action Service
 * Handles ACCEPTED, PENDING, AWAITING_HOST actions with per-action versioning
 * 
 * Version History:
 * - v1: Initial schema with status
 */

const statusChangeDataSchemaV1 = z.object({
  status: StringChangeSchema,
});

export class StatusChangeAuditActionService implements IAuditActionService<typeof statusChangeDataSchemaV1> {
  private helper: AuditActionServiceHelper;

  readonly VERSION = 1;
  readonly dataSchemaV1 = statusChangeDataSchemaV1;

  constructor(helper: AuditActionServiceHelper) {
    this.helper = helper;
  }

  get schema() {
    return z.object({
      version: z.literal(this.VERSION),
      data: this.dataSchemaV1,
    });
  }

  parse(input: unknown): { version: number; data: z.infer<typeof statusChangeDataSchemaV1> } {
    return this.helper.parse({
      version: this.VERSION,
      dataSchema: this.dataSchemaV1,
      input,
    }) as { version: number; data: z.infer<typeof statusChangeDataSchemaV1> };
  }

  parseStored(data: unknown): { version: number; data: z.infer<typeof statusChangeDataSchemaV1> } {
    return this.helper.parseStored({
      schema: this.schema,
      data,
    }) as { version: number; data: z.infer<typeof statusChangeDataSchemaV1> };
  }

  getVersion(data: unknown): number {
    return this.helper.getVersion(data);
  }

  getDisplaySummary(storedData: { version: number; data: z.infer<typeof statusChangeDataSchemaV1> }, t: TFunction): string {
    return t('audit.status_changed');
  }

  getDisplayDetails(storedData: { version: number; data: z.infer<typeof statusChangeDataSchemaV1> }, t: TFunction): Record<string, string> {
    const { data } = storedData;
    return {
      'Status': `${data.status.old ?? '-'} → ${data.status.new ?? '-'}`,
    };
  }
}

export type StatusChangeAuditData = z.infer<typeof statusChangeDataSchemaV1>;
