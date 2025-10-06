import { z } from "zod";

import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

import type { EmailValidationRequest, EmailValidationResult, EmailValidationStatus } from "../dto/types";
import type { IEmailValidationProviderService } from "./IEmailValidationProviderService.interface";

const ZeroBounceApiResponseSchema = z.object({
  address: z.string(),
  status: z.enum(["valid", "invalid", "catch-all", "unknown", "spamtrap", "abuse", "do_not_mail"]),
  sub_status: z.string().nullable(),
});

type ZeroBounceApiResponse = z.infer<typeof ZeroBounceApiResponseSchema>;

export class ZeroBounceEmailValidationProviderService implements IEmailValidationProviderService {
  private readonly apiKey: string;
  private readonly apiBaseUrl = "https://api.zerobounce.net/v2";
  private readonly logger = logger.getSubLogger({ prefix: ["ZeroBounceEmailValidationProviderService"] });

  constructor() {
    this.apiKey = process.env.ZEROBOUNCE_API_KEY || "";
  }

  async validateEmail(request: EmailValidationRequest, signal?: AbortSignal): Promise<EmailValidationResult> {
    const { email, ipAddress } = request;

    if (!this.apiKey) {
      this.logger.error("ZeroBounce API key not configured");
      throw new Error("ZeroBounce API key not configured");
    }

    // Create the API URL with parameters
    const url = new URL(`${this.apiBaseUrl}/validate`);
    url.searchParams.append("api_key", this.apiKey);
    url.searchParams.append("email", email);
    if (ipAddress) {
      url.searchParams.append("ip_address", ipAddress);
    }

    // Make the API request
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Cal.com",
      },
      signal,
    });

    if (!response.ok) {
      throw new Error(`ZeroBounce API returned ${response.status}: ${response.statusText}`);
    }

    const rawData = await response.json();

    // Validate the API response using Zod schema
    const validationResult = ZeroBounceApiResponseSchema.safeParse(rawData);

    if (!validationResult.success) {
      this.logger.error(
        "ZeroBounce API returned invalid response format",
        safeStringify({
          email: email,
          rawResponse: rawData,
          validationErrors: validationResult.error.issues,
        })
      );
      throw new Error(`Invalid response format from ZeroBounce API: ${validationResult.error.message}`);
    }

    const data = validationResult.data;
    const result = this.mapZeroBounceResponse(data);

    return result;
  }

  private mapZeroBounceResponse(response: ZeroBounceApiResponse): EmailValidationResult {
    return {
      status: this.normalizeStatus(response.status),
      subStatus: response.sub_status ?? undefined,
    };
  }

  /**
   * Maps ZeroBounce API statuses to canonical format.
   */
  private normalizeStatus(status: string): EmailValidationStatus {
    const normalizedStatus = status.toLowerCase();

    // Map ZeroBounce statuses to canonical format
    switch (normalizedStatus) {
      case "valid":
        return "valid";
      case "invalid":
        return "invalid";
      case "catch-all":
        return "catch-all";
      case "unknown":
        return "unknown";
      case "spamtrap":
        return "spamtrap";
      case "abuse":
        return "abuse";
      case "do_not_mail":
        return "do-not-mail";
      default:
        // For any unknown status, default to valid to avoid blocking legitimate users
        this.logger.warn("Unknown ZeroBounce status encountered", safeStringify({ status }));
        return "valid";
    }
  }
}
