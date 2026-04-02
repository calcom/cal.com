import z from "zod";
import type {
  DnsConfig,
  DomainConfigStatus,
  DomainInfo,
  DomainManager,
  DomainRegistrationResult,
  VerificationAttemptResult,
} from "./domain-manager";
import { DomainAdapterError } from "./lib/domain-adapter-error";

export interface VercelDomainManagerConfig {
  projectId: string;
  teamId?: string;
  authToken: string;
}

const vercelDomainResponseSchema = z.object({
  name: z.string().optional(),
  apexName: z.string().optional(),
  verified: z.boolean().optional(),
  verification: z
    .array(
      z.object({
        type: z.string(),
        domain: z.string(),
        value: z.string(),
        reason: z.string(),
      })
    )
    .optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
});

const vercelConfigResponseSchema = z.object({
  misconfigured: z.boolean().optional(),
  conflicts: z
    .array(
      z.object({
        name: z.string(),
        type: z.string(),
        value: z.string(),
      })
    )
    .optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
});

const vercelDomainApiResponseSchema = z.object({
  error: z
    .object({
      code: z.string().nullish(),
      domain: z.any().nullish(),
      message: z.string().nullish(),
      invalidToken: z.boolean().nullish(),
    })
    .optional(),
});

export class VercelDomainManager implements DomainManager {
  private projectId: string;
  private teamId?: string;
  private authToken: string;

  constructor(config: VercelDomainManagerConfig) {
    this.projectId = config.projectId;
    this.teamId = config.teamId;
    this.authToken = config.authToken;
  }

  async register(domain: string): Promise<DomainRegistrationResult> {
    const normalizedDomain = domain.toLowerCase();

    const response = await fetch(this.buildUrl(`/v9/projects/${this.projectId}/domains`), {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ name: normalizedDomain }),
    });

    let responseJson: unknown;
    try {
      responseJson = await response.json();
    } catch {
      return { success: false };
    }

    const parsedResponse = vercelDomainApiResponseSchema.safeParse(responseJson);

    if (!parsedResponse.success) {
      return { success: false };
    }

    if (!parsedResponse.data.error) {
      return { success: true };
    }

    const error = parsedResponse.data.error;
    if (error.code === "domain_already_in_use")
      throw new DomainAdapterError({ code: "domain_already_in_use", message: "Domain is already registered on this project" });
    if (error.code === "domain_taken")
      throw new DomainAdapterError({ code: "domain_taken", message: "Domain is already used by a different project" });
    if (error.code === "forbidden")
      throw new DomainAdapterError({ code: "forbidden", message: "Vercel denied permission to manage this domain" });
    throw new DomainAdapterError({ code: "unknown", message: error.message ?? "unknown error" });
  }

  async unregister(domain: string): Promise<boolean> {
    const normalizedDomain = domain.toLowerCase();

    const response = await fetch(
      this.buildUrl(`/v9/projects/${this.projectId}/domains/${normalizedDomain}`),
      {
        method: "DELETE",
        headers: this.getHeaders(),
      }
    );

    let data: z.infer<typeof vercelDomainApiResponseSchema>;
    try {
      data = vercelDomainApiResponseSchema.parse(await response.json());
    } catch {
      return false;
    }

    if (!data.error) {
      return true;
    }

    const error = data.error;
    if (error.code === "not_found") return true;
    if (error.code === "forbidden")
      throw new DomainAdapterError({ code: "forbidden", message: "Vercel denied permission to manage this domain" });
    throw new DomainAdapterError({ code: "unknown", message: error.message ?? "unknown error" });
  }

  async getDomainInfo(domain: string): Promise<DomainInfo | null> {
    const normalizedDomain = domain.toLowerCase();

    const response = await fetch(
      this.buildUrl(`/v9/projects/${this.projectId}/domains/${normalizedDomain}`),
      {
        method: "GET",
        headers: this.getHeaders(),
      }
    );

    const parsed = vercelDomainResponseSchema.parse(await response.json());

    if (parsed.error?.code === "not_found") {
      return null;
    }
    if (parsed.error) {
      throw new DomainAdapterError({ code: "provider_error", message: parsed.error.message });
    }

    return {
      verified: parsed.verified ?? false,
      pendingRecords: parsed.verification,
    };
  }

  async getConfigStatus(domain: string): Promise<DomainConfigStatus> {
    const normalizedDomain = domain.toLowerCase();

    const response = await fetch(this.buildUrl(`/v6/domains/${normalizedDomain}/config`), {
      method: "GET",
      headers: this.getHeaders(),
    });

    const parsed = vercelConfigResponseSchema.parse(await response.json());

    if (parsed.error) {
      throw new DomainAdapterError({ code: "config_error", message: parsed.error.message });
    }

    return {
      configured: !parsed.misconfigured,
      conflicts: parsed.conflicts,
    };
  }

  async triggerVerification(domain: string): Promise<VerificationAttemptResult> {
    const normalizedDomain = domain.toLowerCase();

    const response = await fetch(
      this.buildUrl(`/v9/projects/${this.projectId}/domains/${normalizedDomain}/verify`),
      {
        method: "POST",
        headers: this.getHeaders(),
      }
    );

    const parsed = vercelDomainResponseSchema.parse(await response.json());

    if (parsed.error) {
      throw new DomainAdapterError({ code: "verification_error", message: parsed.error.message });
    }

    return {
      verified: parsed.verified ?? false,
      pendingRecords: parsed.verification,
    };
  }

  getDnsConfig(): DnsConfig {
    return {
      aRecordIp: "76.76.21.21",
      cnameTarget: "cname.vercel-dns.com",
      defaultTtl: 86400,
    };
  }

  private buildUrl(path: string): string {
    const url = new URL(path, "https://api.vercel.com");
    if (this.teamId) {
      url.searchParams.set("teamId", this.teamId);
    }
    return url.toString();
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.authToken}`,
      "Content-Type": "application/json",
    };
  }

}
