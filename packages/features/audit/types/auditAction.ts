import { z } from "zod";
import type { AuditAction as PrismaAuditAction } from "@calcom/prisma/enums";
import type { AuditCategory, AuditSensitivity, AuditVisibility } from "./auditClassification";

type ActionMetadata = {
  category: AuditCategory;
  visibility: AuditVisibility;
  sensitivity: AuditSensitivity;
};

export const AUDIT_ACTION_METADATA = {
  // Security — Wave 1
  LOGIN: { category: "SECURITY", visibility: "CUSTOMER_VISIBLE", sensitivity: "PSEUDONYMIZED" },
  PASSWORD_CHANGED: { category: "SECURITY", visibility: "CUSTOMER_VISIBLE", sensitivity: "NONE" },
  PASSWORD_RESET_REQUESTED: { category: "SECURITY", visibility: "INTERNAL_ONLY", sensitivity: "NONE" },
  TWO_FACTOR_ENABLED: { category: "SECURITY", visibility: "CUSTOMER_VISIBLE", sensitivity: "NONE" },
  TWO_FACTOR_DISABLED: { category: "SECURITY", visibility: "CUSTOMER_VISIBLE", sensitivity: "NONE" },
  IMPERSONATION_START: { category: "SECURITY", visibility: "CUSTOMER_VISIBLE", sensitivity: "PSEUDONYMIZED" },
  IMPERSONATION_STOP: { category: "SECURITY", visibility: "CUSTOMER_VISIBLE", sensitivity: "PSEUDONYMIZED" },
  EMAIL_CHANGED: { category: "SECURITY", visibility: "CUSTOMER_VISIBLE", sensitivity: "IDENTIFIED" },
  ACCOUNT_LOCKED: { category: "SECURITY", visibility: "INTERNAL_ONLY", sensitivity: "NONE" },
  ACCOUNT_UNLOCKED: { category: "SECURITY", visibility: "INTERNAL_ONLY", sensitivity: "NONE" },

  // Access control — Wave 1
  MEMBER_ADDED: { category: "ACCESS", visibility: "CUSTOMER_VISIBLE", sensitivity: "NONE" },
  MEMBER_REMOVED: { category: "ACCESS", visibility: "CUSTOMER_VISIBLE", sensitivity: "NONE" },
  ROLE_CHANGED: { category: "ACCESS", visibility: "CUSTOMER_VISIBLE", sensitivity: "NONE" },

  // API credential lifecycle — Wave 1
  API_KEY_CREATED: { category: "SECURITY", visibility: "CUSTOMER_VISIBLE", sensitivity: "NONE" },
  API_KEY_REVOKED: { category: "SECURITY", visibility: "CUSTOMER_VISIBLE", sensitivity: "NONE" },

  // Workflow automation
  WORKFLOW_CREATED: { category: "DATA", visibility: "CUSTOMER_VISIBLE", sensitivity: "NONE" },
  WORKFLOW_MODIFIED: { category: "DATA", visibility: "CUSTOMER_VISIBLE", sensitivity: "NONE" },
  WORKFLOW_DELETED: { category: "DATA", visibility: "CUSTOMER_VISIBLE", sensitivity: "NONE" },
} as const satisfies Record<string, ActionMetadata>;

export type AuditAction = keyof typeof AUDIT_ACTION_METADATA;

export const AuditActionSchema = z.enum(
  Object.keys(AUDIT_ACTION_METADATA) as [AuditAction, ...AuditAction[]]
);

export const AuditActions = Object.fromEntries(
  Object.keys(AUDIT_ACTION_METADATA).map((key) => [key, key])
) as { [K in AuditAction]: K };

// Build fails if AUDIT_ACTION_METADATA keys drift from the Prisma AuditAction enum
type _AssertKeysMatch = [keyof typeof AUDIT_ACTION_METADATA] extends [PrismaAuditAction]
  ? [PrismaAuditAction] extends [keyof typeof AUDIT_ACTION_METADATA]
    ? true
    : never
  : never;
const _assertKeysMatch: _AssertKeysMatch = true;
void _assertKeysMatch;
