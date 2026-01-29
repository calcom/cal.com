import { extractBearerToken } from "./bearer-token";

describe("extractBearerToken", () => {
  describe("valid Bearer tokens", () => {
    it("should extract token from standard 'Bearer token' format", () => {
      expect(extractBearerToken("Bearer token123")).toBe("token123");
    });

    it("should extract token with lowercase 'bearer' scheme", () => {
      expect(extractBearerToken("bearer token123")).toBe("token123");
    });

    it("should extract token with uppercase 'BEARER' scheme", () => {
      expect(extractBearerToken("BEARER token123")).toBe("token123");
    });

    it("should extract token with mixed case 'BeArEr' scheme", () => {
      expect(extractBearerToken("BeArEr token123")).toBe("token123");
    });

    it("should handle extra whitespace between Bearer and token", () => {
      expect(extractBearerToken("Bearer   token123")).toBe("token123");
    });

    it("should handle leading whitespace in header", () => {
      expect(extractBearerToken("  Bearer token123")).toBe("token123");
    });

    it("should handle trailing whitespace in header", () => {
      expect(extractBearerToken("Bearer token123  ")).toBe("token123");
    });

    it("should handle leading and trailing whitespace in header", () => {
      expect(extractBearerToken("  Bearer  token123  ")).toBe("token123");
    });

    it("should preserve token with special characters", () => {
      expect(extractBearerToken("Bearer abc-123_456.xyz")).toBe("abc-123_456.xyz");
    });

    it("should handle long JWT-style tokens", () => {
      const jwtToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      expect(extractBearerToken(`Bearer ${jwtToken}`)).toBe(jwtToken);
    });
  });

  describe("empty and missing Authorization headers", () => {
    it("should return undefined for empty string", () => {
      expect(extractBearerToken("")).toBeUndefined();
    });

    it("should return undefined for whitespace-only string", () => {
      expect(extractBearerToken("   ")).toBeUndefined();
    });

    it("should return undefined for undefined", () => {
      expect(extractBearerToken(undefined)).toBeUndefined();
    });

    it("should return undefined for null", () => {
      expect(extractBearerToken(null)).toBeUndefined();
    });
  });

  describe("Bearer without token (empty token)", () => {
    it("should return undefined for 'Bearer ' (Bearer with trailing space only)", () => {
      expect(extractBearerToken("Bearer ")).toBeUndefined();
    });

    it("should return undefined for 'Bearer  ' (Bearer with multiple trailing spaces)", () => {
      expect(extractBearerToken("Bearer  ")).toBeUndefined();
    });

    it("should return undefined for '  Bearer  ' (Bearer with surrounding spaces)", () => {
      expect(extractBearerToken("  Bearer  ")).toBeUndefined();
    });
  });

  describe("invalid Authorization schemes", () => {
    it("should return undefined for Basic auth", () => {
      expect(extractBearerToken("Basic dXNlcjpwYXNz")).toBeUndefined();
    });

    it("should return undefined for Digest auth", () => {
      expect(extractBearerToken("Digest username='user'")).toBeUndefined();
    });

    it("should return undefined for token without scheme", () => {
      expect(extractBearerToken("token123")).toBeUndefined();
    });

    it("should return undefined for malformed 'Bearertoken' (no space)", () => {
      expect(extractBearerToken("Bearertoken123")).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    it("should handle token that contains 'Bearer' as part of its value", () => {
      expect(extractBearerToken("Bearer BearerToken123")).toBe("BearerToken123");
    });

    it("should handle tab characters as whitespace", () => {
      expect(extractBearerToken("Bearer\ttoken123")).toBe("token123");
    });

    it("should handle newline in whitespace (regex \\s includes newlines)", () => {
      expect(extractBearerToken("Bearer\ntoken123")).toBe("token123");
    });

    it("should handle token with only spaces in value position", () => {
      // "Bearer    " - only spaces after Bearer, should return undefined
      expect(extractBearerToken("Bearer    ")).toBeUndefined();
    });
  });
});
