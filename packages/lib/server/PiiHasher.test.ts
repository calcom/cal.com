import { describe, it, expect } from "vitest";
import { hashEmail, Md5PiiHasher } from "./PiiHasher";

describe("PII Hasher Test Suite", () => {

  const hasher = new Md5PiiHasher("test-salt");

  it("can hash email addresses", async () => {
    const email = "sensitive_data@example.com";
    const hashedEmail = hashEmail(email, hasher);
    expect(hashedEmail).toBe("2e74ca9edc8add1709b0d049aa2a0959@example.com");
  });

  it("can hash PII with saltyMd5", async () => {
    const pii = "sensitive_data";
    const hashedPii = hasher.hash(pii);
    expect(hashedPii).toBe("2e74ca9edc8add1709b0d049aa2a0959");
  });

  it("handles hashing with different salt", () => {
    const differentHasher = new Md5PiiHasher("different-salt");
    const pii = "sensitive_data";
    const hashedPii = differentHasher.hash(pii);
    expect(hashedPii).not.toBe(hasher.hash(pii));
  });
});
