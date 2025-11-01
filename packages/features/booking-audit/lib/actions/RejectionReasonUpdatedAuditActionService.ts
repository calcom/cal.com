import { z } from "zod";
import type { TFunction } from "next-i18next";

/**
 * Rejection Reason Updated Audit Action Service
 * Handles REJECTION_REASON_UPDATED action
 */
export class RejectionReasonUpdatedAuditActionService {
  static readonly schema = z.object({
    rejectionReason: z.string(),
  });
  
  parse(data: unknown): z.infer<typeof RejectionReasonUpdatedAuditActionService.schema> {
    return RejectionReasonUpdatedAuditActionService.schema.parse(data);
  }
  
  getDisplaySummary(data: z.infer<typeof RejectionReasonUpdatedAuditActionService.schema>, t: TFunction): string {
    return t('audit.rejection_reason_updated');
  }
  
  getDisplayDetails(data: z.infer<typeof RejectionReasonUpdatedAuditActionService.schema>, t: TFunction): Record<string, string> {
    return {
      'Reason': data.rejectionReason,
    };
  }
}

export type RejectionReasonUpdatedAuditData = z.infer<typeof RejectionReasonUpdatedAuditActionService.schema>;

