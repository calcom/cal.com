import { describe, it, expect } from "vitest";

import {
  OAuth2BareMinimumUniversalSchema,
  OAuth2UniversalSchema,
  OAuth2UniversalSchemaWithCalcomBackwardCompatibility,
  OAuth2TokenResponseInDbSchema,
} from "./universalSchema";

describe("OAuth2BareMinimumUniversalSchema", () => {
  it("should parse valid object with just access_token", () => {
    const result = OAuth2BareMinimumUniversalSchema.safeParse({ access_token: "abc123" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.access_token).toBe("abc123");
    }
  });

  it("should fail when access_token is missing", () => {
    const result = OAuth2BareMinimumUniversalSchema.safeParse({ token_type: "Bearer" });
    expect(result.success).toBe(false);
  });

  it("should passthrough extra fields", () => {
    const result = OAuth2BareMinimumUniversalSchema.safeParse({
      access_token: "abc123",
      custom_field: "custom_value",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.custom_field).toBe("custom_value");
    }
  });
});

describe("OAuth2UniversalSchema", () => {
  it("should parse with all optional fields", () => {
    const result = OAuth2UniversalSchema.safeParse({
      access_token: "abc123",
      refresh_token: "refresh_abc",
      scope: "calendar",
      expiry_date: 1700000000000,
      token_type: "Bearer",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.refresh_token).toBe("refresh_abc");
      expect(result.data.scope).toBe("calendar");
      expect(result.data.expiry_date).toBe(1700000000000);
    }
  });

  it("should parse with only required fields", () => {
    const result = OAuth2UniversalSchema.safeParse({
      access_token: "abc123",
    });
    expect(result.success).toBe(true);
  });

  it("should fail with invalid expiry_date type", () => {
    const result = OAuth2UniversalSchema.safeParse({
      access_token: "abc123",
      expiry_date: "not-a-number",
    });
    expect(result.success).toBe(false);
  });
});

describe("OAuth2UniversalSchemaWithCalcomBackwardCompatibility", () => {
  it("should accept expires_in field", () => {
    const result = OAuth2UniversalSchemaWithCalcomBackwardCompatibility.safeParse({
      access_token: "abc123",
      expires_in: 3600,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expires_in).toBe(3600);
    }
  });

  it("should accept both expiry_date and expires_in", () => {
    const result = OAuth2UniversalSchemaWithCalcomBackwardCompatibility.safeParse({
      access_token: "abc123",
      expiry_date: 1700000000000,
      expires_in: 3600,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expiry_date).toBe(1700000000000);
      expect(result.data.expires_in).toBe(3600);
    }
  });
});

describe("OAuth2TokenResponseInDbSchema", () => {
  it("should accept null", () => {
    const result = OAuth2TokenResponseInDbSchema.safeParse(null);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it("should parse valid token response", () => {
    const result = OAuth2TokenResponseInDbSchema.safeParse({
      access_token: "abc123",
      refresh_token: "refresh",
      expiry_date: 1700000000000,
    });
    expect(result.success).toBe(true);
  });
});
