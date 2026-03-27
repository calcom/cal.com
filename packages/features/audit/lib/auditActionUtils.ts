import { type AuditAction, AUDIT_ACTION_METADATA } from "../types/auditAction";
import type { AuditCategory, AuditSensitivity, AuditVisibility } from "../types/auditClassification";

export function getCategoryForAction(action: AuditAction): AuditCategory {
  return AUDIT_ACTION_METADATA[action].category;
}

export function getVisibilityForAction(action: AuditAction): AuditVisibility {
  return AUDIT_ACTION_METADATA[action].visibility;
}

export function getSensitivityForAction(action: AuditAction): AuditSensitivity {
  return AUDIT_ACTION_METADATA[action].sensitivity;
}
