import { z } from "zod";

export const AuditResultSchema = z.enum(["SUCCESS", "FAILURE", "DENIED"]);
export type AuditResult = z.infer<typeof AuditResultSchema>;

export const AuditCategorySchema = z.enum(["SECURITY", "ACCESS", "BILLING", "DATA"]);
export type AuditCategory = z.infer<typeof AuditCategorySchema>;

export const AuditVisibilitySchema = z.enum(["CUSTOMER_VISIBLE", "INTERNAL_ONLY"]);
export type AuditVisibility = z.infer<typeof AuditVisibilitySchema>;

export const AuditSensitivitySchema = z.enum(["NONE", "PSEUDONYMIZED", "IDENTIFIED"]);
export type AuditSensitivity = z.infer<typeof AuditSensitivitySchema>;

export const AuditRetentionTierSchema = z.enum(["STANDARD", "EXTENDED"]);
export type AuditRetentionTier = z.infer<typeof AuditRetentionTierSchema>;
