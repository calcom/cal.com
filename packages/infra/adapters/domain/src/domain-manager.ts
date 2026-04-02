export interface DnsConfig {
  aRecordIp: string;
  cnameTarget: string;
  defaultTtl: number;
}

export interface DomainVerificationRecord {
  type: string;
  domain: string;
  value: string;
  reason: string;
}

export interface Conflict {
  name: string;
  type: string;
  value: string;
}

export interface DomainInfo {
  verified: boolean;
  pendingRecords?: DomainVerificationRecord[];
}

export interface DomainConfigStatus {
  configured: boolean;
  conflicts?: Conflict[];
}

export interface VerificationAttemptResult {
  verified: boolean;
  pendingRecords?: DomainVerificationRecord[];
}

export interface DomainRegistrationResult {
  success: boolean;
}

export interface DomainManager {
  register(domain: string): Promise<DomainRegistrationResult>;
  unregister(domain: string): Promise<boolean>;
  getDomainInfo(domain: string): Promise<DomainInfo | null>;
  getConfigStatus(domain: string): Promise<DomainConfigStatus>;
  triggerVerification(domain: string): Promise<VerificationAttemptResult>;
  getDnsConfig(): DnsConfig;
}
