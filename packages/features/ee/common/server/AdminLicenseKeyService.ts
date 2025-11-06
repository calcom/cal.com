import { CALCOM_PRIVATE_API_ROUTE } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";

import { generateNonce, createSignature } from "./private-api-utils";
import type {
  Deployment,
  DeploymentStripeInfo,
  KeyStripeInfo,
  ListDeploymentsQuery,
  PaginatedDeployments,
  SendLicenseEmailResponse,
  UpdateDeploymentRequest,
  UpdateKeyRequest,
} from "./types/admin";

export interface IAdminLicenseKeyService {
  listDeployments(query?: ListDeploymentsQuery): Promise<PaginatedDeployments>;
  updateDeployment(id: string, data: UpdateDeploymentRequest): Promise<Deployment>;
  sendLicenseEmail(id: string): Promise<SendLicenseEmailResponse>;
  getDeploymentStripeInfo(id: string): Promise<DeploymentStripeInfo>;
  updateLicenseKey(id: string, data: UpdateKeyRequest): Promise<import("./types/admin").LicenseKey>;
  getLicenseKeyStripeInfo(id: string): Promise<KeyStripeInfo>;
}

class AdminLicenseKeyService implements IAdminLicenseKeyService {
  private readonly baseUrl = CALCOM_PRIVATE_API_ROUTE;
  private readonly adminSignatureToken: string;

  // Private constructor to prevent direct instantiation
  private constructor(adminSignatureToken: string) {
    this.baseUrl = CALCOM_PRIVATE_API_ROUTE;
    this.adminSignatureToken = adminSignatureToken;
  }

  // Static async factory method
  public static create(adminSignatureToken: string): IAdminLicenseKeyService {
    if (!adminSignatureToken) {
      throw new Error("Admin signature token is required");
    }
    return new AdminLicenseKeyService(adminSignatureToken);
  }

  private async fetcher({
    url,
    body,
    options = {},
  }: {
    url: string;
    body?: Record<string, unknown>;
    options?: RequestInit;
  }): Promise<Response> {
    const nonce = generateNonce();

    const headers = {
      ...options.headers,
      "Content-Type": "application/json",
      nonce: nonce,
    } as Record<string, string>;

    if (!this.adminSignatureToken) {
      logger.warn("Admin signature token needs to be set for admin API calls.");
    } else {
      const signature = createSignature(body || {}, nonce, this.adminSignatureToken);
      headers["signature"] = signature;
    }

    return await fetch(url, {
      ...options,
      headers: headers,
      body: body ? JSON.stringify(body) : undefined,
      // In case of hang, abort the operation after 10 seconds (admin operations may take longer)
      signal: AbortSignal.timeout(10000),
    });
  }

  private buildQueryString(params: Record<string, unknown>): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : "";
  }

  async listDeployments(query?: ListDeploymentsQuery): Promise<PaginatedDeployments> {
    try {
      const queryString = query ? this.buildQueryString(query) : "";
      const response = await this.fetcher({
        url: `${this.baseUrl}/v1/admin/deployments${queryString}`,
        options: {
          method: "GET",
          mode: "cors",
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(`Failed to list deployments: ${error.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error("Listing deployments failed:", error);
      throw error;
    }
  }

  async updateDeployment(id: string, data: UpdateDeploymentRequest): Promise<Deployment> {
    try {
      const response = await this.fetcher({
        url: `${this.baseUrl}/v1/admin/deployments/${id}`,
        body: data,
        options: {
          method: "PATCH",
          mode: "cors",
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(`Failed to update deployment: ${error.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error("Updating deployment failed:", error);
      throw error;
    }
  }

  async sendLicenseEmail(id: string): Promise<SendLicenseEmailResponse> {
    try {
      const response = await this.fetcher({
        url: `${this.baseUrl}/v1/admin/deployments/${id}/send-license-email`,
        options: {
          method: "POST",
          mode: "cors",
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(`Failed to send license email: ${error.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error("Sending license email failed:", error);
      throw error;
    }
  }

  async getDeploymentStripeInfo(id: string): Promise<DeploymentStripeInfo> {
    try {
      const response = await this.fetcher({
        url: `${this.baseUrl}/v1/admin/deployments/${id}/stripe`,
        options: {
          method: "GET",
          mode: "cors",
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(`Failed to get deployment Stripe info: ${error.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error("Getting deployment Stripe info failed:", error);
      throw error;
    }
  }

  async updateLicenseKey(id: string, data: UpdateKeyRequest): Promise<import("./types/admin").LicenseKey> {
    try {
      const response = await this.fetcher({
        url: `${this.baseUrl}/v1/admin/keys/${id}`,
        body: data,
        options: {
          method: "PATCH",
          mode: "cors",
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(`Failed to update license key: ${error.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error("Updating license key failed:", error);
      throw error;
    }
  }

  async getLicenseKeyStripeInfo(id: string): Promise<KeyStripeInfo> {
    try {
      const response = await this.fetcher({
        url: `${this.baseUrl}/v1/admin/keys/${id}/stripe`,
        options: {
          method: "GET",
          mode: "cors",
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(`Failed to get license key Stripe info: ${error.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error("Getting license key Stripe info failed:", error);
      throw error;
    }
  }
}

export class NoopAdminLicenseKeyService implements IAdminLicenseKeyService {
  async listDeployments(_query?: ListDeploymentsQuery): Promise<PaginatedDeployments> {
    return Promise.resolve({
      data: [],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
      },
    });
  }

  async updateDeployment(_id: string, _data: UpdateDeploymentRequest): Promise<Deployment> {
    throw new Error("NoopAdminLicenseKeyService: updateDeployment not implemented");
  }

  async sendLicenseEmail(_id: string): Promise<SendLicenseEmailResponse> {
    return Promise.resolve({
      success: false,
      message: "NoopAdminLicenseKeyService: sendLicenseEmail not implemented",
    });
  }

  async getDeploymentStripeInfo(_id: string): Promise<DeploymentStripeInfo> {
    throw new Error("NoopAdminLicenseKeyService: getDeploymentStripeInfo not implemented");
  }

  async updateLicenseKey(
    _id: string,
    _data: UpdateKeyRequest
  ): Promise<import("./types/admin").LicenseKey> {
    throw new Error("NoopAdminLicenseKeyService: updateLicenseKey not implemented");
  }

  async getLicenseKeyStripeInfo(_id: string): Promise<KeyStripeInfo> {
    throw new Error("NoopAdminLicenseKeyService: getLicenseKeyStripeInfo not implemented");
  }
}

export default AdminLicenseKeyService;

