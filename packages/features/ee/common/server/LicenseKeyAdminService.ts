import type { ILicenseKeyAdminService } from "./ILicenseKeyAdminService";
import type {
  AdminApiError,
  DateRangeParams,
  GetDeploymentUsageResponse,
  GetKeysResponse,
  GetKeyUsageResponse,
  ListDeploymentsParams,
  ListDeploymentsResponse,
  PaginationParams,
  RegenerateSignatureResponse,
} from "./LicenseKeyAdminService.types";
import { generateNonce, createSignature } from "./private-api-utils";
import {
  getDeploymentKey,
  getDeploymentSignatureToken,
} from "@calcom/features/ee/deployment/lib/getDeploymentKey";
import type { IDeploymentRepository } from "@calcom/features/ee/deployment/repositories/IDeploymentRepository";
import { CALCOM_PRIVATE_API_ROUTE } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";

export type { ILicenseKeyAdminService } from "./ILicenseKeyAdminService";

class LicenseKeyAdminService implements ILicenseKeyAdminService {
  private readonly baseUrl: string;
  private readonly licenseKey: string;
  private readonly signatureToken: string;

  private constructor(licenseKey: string, signatureToken: string) {
    this.baseUrl = CALCOM_PRIVATE_API_ROUTE;
    this.licenseKey = licenseKey;
    this.signatureToken = signatureToken;
  }

  public static async create(
    deploymentRepo: IDeploymentRepository
  ): Promise<ILicenseKeyAdminService> {
    const licenseKey = await getDeploymentKey(deploymentRepo);
    const signatureToken = await getDeploymentSignatureToken(deploymentRepo);

    if (!licenseKey) {
      throw new Error("License key is required for admin operations");
    }

    if (!signatureToken) {
      throw new Error("Signature token is required for admin operations");
    }

    return new LicenseKeyAdminService(licenseKey, signatureToken);
  }

  private buildQueryString<T extends object>(params: T): string {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : "";
  }

  private async fetcher<T>({
    url,
    body,
    method = "GET",
  }: {
    url: string;
    body?: Record<string, unknown>;
    method?: "GET" | "POST" | "PUT" | "DELETE";
  }): Promise<T> {
    const nonce = generateNonce();
    const signature = createSignature(body || {}, nonce, this.signatureToken);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      nonce: nonce,
      signature: signature,
      "x-cal-license-key": this.licenseKey,
    };

    const options: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(10000), // 10 second timeout for admin operations
    };

    if (body && method !== "GET") {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorData = (await response
        .json()
        .catch(() => ({}))) as AdminApiError;
      const errorMessage = Array.isArray(errorData.message)
        ? errorData.message.join(", ")
        : errorData.message || `Request failed with status ${response.status}`;

      logger.error(`Admin API error: ${errorMessage}`, {
        url,
        status: response.status,
      });
      throw new Error(errorMessage);
    }

    return response.json() as Promise<T>;
  }

  /**
   * List all deployments with optional filtering and pagination
   */
  async listDeployments(
    params: ListDeploymentsParams = {}
  ): Promise<ListDeploymentsResponse> {
    const queryString = this.buildQueryString(params);
    const url = `${this.baseUrl}/admin/deployments${queryString}`;

    return this.fetcher<ListDeploymentsResponse>({ url });
  }

  /**
   * Get all keys for a specific deployment
   */
  async getKeysByDeployment(
    deploymentId: string,
    params: PaginationParams = {}
  ): Promise<GetKeysResponse> {
    const queryString = this.buildQueryString(params);
    const url = `${this.baseUrl}/admin/deployments/${deploymentId}/keys${queryString}`;

    return this.fetcher<GetKeysResponse>({ url });
  }

  /**
   * Get usage data for a specific deployment within a date range
   */
  async getUsageByDeployment(
    deploymentId: string,
    params: DateRangeParams
  ): Promise<GetDeploymentUsageResponse> {
    const queryString = this.buildQueryString(params);
    const url = `${this.baseUrl}/admin/deployments/${deploymentId}/usage${queryString}`;

    return this.fetcher<GetDeploymentUsageResponse>({ url });
  }

  /**
   * Get usage data for a specific key within a date range
   */
  async getUsageByKey(
    keyId: string,
    params: DateRangeParams
  ): Promise<GetKeyUsageResponse> {
    const queryString = this.buildQueryString(params);
    const url = `${this.baseUrl}/admin/keys/${keyId}/usage${queryString}`;

    return this.fetcher<GetKeyUsageResponse>({ url });
  }

  /**
   * Regenerate the signature token for a deployment
   * Note: The new signature is only returned once and should be stored securely
   */
  async regenerateSignatureToken(
    deploymentId: string
  ): Promise<RegenerateSignatureResponse> {
    const url = `${this.baseUrl}/admin/deployments/${deploymentId}/regenerate-signature`;

    return this.fetcher<RegenerateSignatureResponse>({
      url,
      method: "POST",
      body: {},
    });
  }
}

export class LicenseKeyAdminSingleton {
  private static instance: ILicenseKeyAdminService | null = null;

  private constructor() {}

  public static async getInstance(
    deploymentRepo: IDeploymentRepository
  ): Promise<ILicenseKeyAdminService> {
    if (!LicenseKeyAdminSingleton.instance) {
      LicenseKeyAdminSingleton.instance = await LicenseKeyAdminService.create(
        deploymentRepo
      );
    }
    return LicenseKeyAdminSingleton.instance;
  }
}

export default LicenseKeyAdminService;
