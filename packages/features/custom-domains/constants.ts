export const DomainVerificationStatus = {
  VALID: "VALID",
  PENDING: "PENDING",
  NOT_FOUND: "NOT_FOUND",
  INVALID_CONFIGURATION: "INVALID_CONFIGURATION",
  CONFLICTING_DNS: "CONFLICTING_DNS",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

export type DomainVerificationStatus = (typeof DomainVerificationStatus)[keyof typeof DomainVerificationStatus];

export interface DomainVerificationResult {
  status: DomainVerificationStatus;
}

export const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

export const DOMAIN_ALREADY_IN_USE_ERROR = "Domain is already in use";
