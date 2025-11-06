import crypto from "crypto";

import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import type { DeelCredentialKey, DeelEmployee, DeelOAuthToken } from "../types";

const DEEL_API_BASE_URL = process.env.DEEL_API_BASE_URL || "https://api.deel.com/v2";
const DEEL_AUTH_URL = process.env.DEEL_AUTH_URL || "https://auth.deel.com";

export class DeelClient {
  private credentialId: number;
  private accessToken: string;
  private refreshToken: string;
  private expiresAt: number;
  private employeeId?: string;
  private clientId: string;
  private clientSecret: string;

  constructor(
    credentialId: number,
    credentialKey: DeelCredentialKey,
    clientId: string,
    clientSecret: string
  ) {
    this.credentialId = credentialId;
    this.accessToken = credentialKey.access_token;
    this.refreshToken = credentialKey.refresh_token;
    this.expiresAt = credentialKey.expires_at;
    this.employeeId = credentialKey.employee_id;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  static getAuthorizationUrl(state: string, redirectUri: string, clientId: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: "time-off:read employees:read",
      state,
    });

    return `${DEEL_AUTH_URL}/oauth/authorize?${params.toString()}`;
  }

  static async exchangeCodeForToken(
    code: string,
    redirectUri: string,
    clientId: string,
    clientSecret: string
  ): Promise<DeelOAuthToken> {
    const response = await fetch(`${DEEL_AUTH_URL}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to exchange code for token: ${response.statusText}`);
    }

    return response.json();
  }

  static verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");

    if (signature.length !== expectedSignature.length) {
      return false;
    }

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  private async refreshAccessToken(): Promise<void> {
    const response = await fetch(`${DEEL_AUTH_URL}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: this.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.statusText}`);
    }

    const tokenData: DeelOAuthToken = await response.json();

    this.accessToken = tokenData.access_token;
    this.refreshToken = tokenData.refresh_token;
    this.expiresAt = Date.now() + tokenData.expires_in * 1000;

    const credentialKey: DeelCredentialKey = {
      access_token: this.accessToken,
      refresh_token: this.refreshToken,
      expires_at: this.expiresAt,
      employee_id: this.employeeId,
    };

    await prisma.credential.update({
      where: { id: this.credentialId },
      data: {
        key: credentialKey as unknown as Prisma.InputJsonValue,
      },
    });
  }

  private async ensureValidToken(): Promise<void> {
    if (Date.now() >= this.expiresAt - 60000) {
      await this.refreshAccessToken();
    }
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    await this.ensureValidToken();

    const response = await fetch(`${DEEL_API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Deel API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getCurrentEmployee(): Promise<DeelEmployee> {
    return this.makeRequest<DeelEmployee>("/me");
  }

  async getEmployee(employeeId: string): Promise<DeelEmployee> {
    return this.makeRequest<DeelEmployee>(`/employees/${employeeId}`);
  }
}
