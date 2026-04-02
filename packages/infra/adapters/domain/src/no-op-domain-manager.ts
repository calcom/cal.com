import type {
  DnsConfig,
  DomainConfigStatus,
  DomainInfo,
  DomainManager,
  DomainRegistrationResult,
  VerificationAttemptResult,
} from "./domain-manager";

export class NoOpDomainManager implements DomainManager {
  async register(_domain: string): Promise<DomainRegistrationResult> {
    return { success: true };
  }

  async unregister(_domain: string): Promise<boolean> {
    return true;
  }

  async getDomainInfo(_domain: string): Promise<DomainInfo | null> {
    return { verified: false };
  }

  async getConfigStatus(_domain: string): Promise<DomainConfigStatus> {
    return { configured: true };
  }

  async triggerVerification(_domain: string): Promise<VerificationAttemptResult> {
    return { verified: false };
  }

  getDnsConfig(): DnsConfig {
    return {
      aRecordIp: "0.0.0.0",
      cnameTarget: "localhost",
      defaultTtl: 0,
    };
  }
}
