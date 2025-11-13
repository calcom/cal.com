import { z } from "zod";
import type { TFunction } from "next-i18next";

import { StringChangeSchema } from "../common/changeSchemas";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService } from "./IAuditActionService";

/**
 * Status Change Audit Action Service
 * Handles ACCEPTED, PENDING, AWAITING_HOST actions with per-action versioning
 * 
 * Version History:
 * - v1: Initial schema with status
 */

const statusChangeFieldsSchemaV1 = z.object({
  status: StringChangeSchema,
});

export class StatusChangeAuditActionService implements IAuditActionService<typeof statusChangeFieldsSchemaV1> {
  private helper: AuditActionServiceHelper<typeof statusChangeFieldsSchemaV1>;

  readonly VERSION = 1;
  readonly fieldsSchemaV1 = statusChangeFieldsSchemaV1;
  readonly dataSchema = z.object({
    version: z.literal(this.VERSION),
    fields: this.fieldsSchemaV1,
  });

  constructor() {
    this.helper = new AuditActionServiceHelper({ fieldsSchema: statusChangeFieldsSchemaV1, version: this.VERSION });
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

  getDisplaySummary(storedData: { version: number; fields: z.infer<typeof statusChangeFieldsSchemaV1> }, t: TFunction): string {
    return t('audit.status_changed');
  }

  getDisplayDetails(storedData: { version: number; fields: z.infer<typeof statusChangeFieldsSchemaV1> }, t: TFunction): Record<string, string> {
    const { fields } = storedData;
    return {
      'Status': `${fields.status.old ?? '-'} → ${fields.status.new ?? '-'}`,
    };
  }
}

export type StatusChangeAuditData = z.infer<typeof statusChangeFieldsSchemaV1>;
