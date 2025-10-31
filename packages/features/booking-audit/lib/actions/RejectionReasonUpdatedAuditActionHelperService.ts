import { z } from "zod";
import type { TFunction } from "next-i18next";

/**
 * Rejection Reason Updated Audit Action Helper Service
 * Handles REJECTION_REASON_UPDATED action
 */
export class RejectionReasonUpdatedAuditActionHelperService {
  static readonly schema = z.object({
    rejectionReason: z.string(),
  });
  
  static createData(params: {
    rejectionReason: string;
  }): z.infer<typeof this.schema> {
    return params;
  }
  
  static validate(data: unknown): z.infer<typeof this.schema> {
    return this.schema.parse(data);
  }
  
  static getDisplaySummary(data: z.infer<typeof this.schema>, t: TFunction): string {
    return t('audit.rejection_reason_updated');
  }
  
  static getDisplayDetails(data: z.infer<typeof this.schema>, t: TFunction): Record<string, string> {
    return {
      'Reason': data.rejectionReason,
    };
  }
}

export type RejectionReasonUpdatedAuditData = z.infer<typeof RejectionReasonUpdatedAuditActionHelperService.schema>;

