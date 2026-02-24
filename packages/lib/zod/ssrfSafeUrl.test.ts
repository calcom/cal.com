import { describe, expect, it } from "vitest";
import {
  optionalSsrfSafeUrlSchema,
  optionalSsrfSafeUrlSchemaNotNullable,
  ssrfSafeUrlSchema,
} from "./ssrfSafeUrl";

// Note: In test env, IS_SELF_HOSTED is true (no WEBAPP_HOSTNAME set), so
// validateUrlForSSRFSync allows private IPs and HTTP through.
// The sync validator only does basic URL structure checks + cloud metadata blocking in self-hosted mode.

describe("ssrfSafeUrlSchema", () => {
  it("accepts a valid public HTTPS URL", () => {
    const result = ssrfSafeUrlSchema.safeParse("https://example.com/webhook");
    expect(result.success).toBe(true);
  });

  it("accepts a valid public HTTP URL (self-hosted mode allows HTTP)", () => {
    const result = ssrfSafeUrlSchema.safeParse("http://example.com/webhook");
    expect(result.success).toBe(true);
  });

  it("rejects a non-string input", () => {
    const result = ssrfSafeUrlSchema.safeParse(123);
    expect(result.success).toBe(false);
  });

  it("rejects non-HTTP/HTTPS protocols", () => {
    const result = ssrfSafeUrlSchema.safeParse("ftp://example.com/file");
    expect(result.success).toBe(false);
  });

  it("rejects an invalid URL", () => {
    const result = ssrfSafeUrlSchema.safeParse("not-a-url");
    expect(result.success).toBe(false);
  });

  it("accepts data:image/ URLs", () => {
    const result = ssrfSafeUrlSchema.safeParse("data:image/png;base64,abc123");
    expect(result.success).toBe(true);
  });

  it("rejects non-image data URLs", () => {
    const result = ssrfSafeUrlSchema.safeParse("data:text/html,<h1>hi</h1>");
    expect(result.success).toBe(false);
  });
});

describe("optionalSsrfSafeUrlSchema", () => {
  it("accepts a valid HTTPS URL", () => {
    const result = optionalSsrfSafeUrlSchema.safeParse("https://example.com");
    expect(result.success).toBe(true);
  });

  it("accepts null", () => {
    const result = optionalSsrfSafeUrlSchema.safeParse(null);
    expect(result.success).toBe(true);
  });

  it("accepts undefined", () => {
    const result = optionalSsrfSafeUrlSchema.safeParse(undefined);
    expect(result.success).toBe(true);
  });

  it("accepts empty string", () => {
    const result = optionalSsrfSafeUrlSchema.safeParse("");
    expect(result.success).toBe(true);
  });
});

describe("optionalSsrfSafeUrlSchemaNotNullable", () => {
  it("accepts a valid HTTPS URL", () => {
    const result = optionalSsrfSafeUrlSchemaNotNullable.safeParse("https://example.com");
    expect(result.success).toBe(true);
  });

  it("accepts undefined", () => {
    const result = optionalSsrfSafeUrlSchemaNotNullable.safeParse(undefined);
    expect(result.success).toBe(true);
  });

  it("rejects non-HTTP/HTTPS protocols", () => {
    const result = optionalSsrfSafeUrlSchemaNotNullable.safeParse("ftp://example.com");
    expect(result.success).toBe(false);
  });
});
