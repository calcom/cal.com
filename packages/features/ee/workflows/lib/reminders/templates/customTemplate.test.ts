import { describe, expect, test } from "vitest";

import customTemplate, {
  escapeHtml,
  isValidImageUrl,
  sanitizeBrandColor,
} from "./customTemplate";

describe("escapeHtml", () => {
  test("escapes HTML special characters", () => {
    expect(escapeHtml('&"\'<>')).toBe("&amp;&quot;&#x27;&lt;&gt;");
  });

  test("leaves safe strings unchanged", () => {
    expect(escapeHtml("Hello World")).toBe("Hello World");
  });

  test("handles empty string", () => {
    expect(escapeHtml("")).toBe("");
  });
});

describe("isValidImageUrl", () => {
  test("accepts https URLs", () => {
    expect(isValidImageUrl("https://example.com/logo.png")).toBe(true);
  });

  test("accepts http URLs", () => {
    expect(isValidImageUrl("http://example.com/logo.png")).toBe(true);
  });

  test("accepts relative URLs", () => {
    expect(isValidImageUrl("/api/avatar/123")).toBe(true);
  });

  test("rejects javascript: URLs", () => {
    expect(isValidImageUrl("javascript:alert(1)")).toBe(false);
  });

  test("rejects data: URLs", () => {
    expect(isValidImageUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
  });

  test("rejects invalid URLs", () => {
    expect(isValidImageUrl("not a url at all")).toBe(true); // relative path
  });
});

describe("sanitizeBrandColor", () => {
  test("accepts valid 6-digit hex color", () => {
    expect(sanitizeBrandColor("#FF5733")).toBe("#FF5733");
  });

  test("accepts valid 3-digit hex color", () => {
    expect(sanitizeBrandColor("#F00")).toBe("#F00");
  });

  test("accepts lowercase hex color", () => {
    expect(sanitizeBrandColor("#abcdef")).toBe("#abcdef");
  });

  test("returns default for null", () => {
    expect(sanitizeBrandColor(null)).toBe("#292929");
  });

  test("returns default for undefined", () => {
    expect(sanitizeBrandColor(undefined)).toBe("#292929");
  });

  test("returns default for invalid color", () => {
    expect(sanitizeBrandColor("red")).toBe("#292929");
  });

  test("returns default for color without hash", () => {
    expect(sanitizeBrandColor("FF5733")).toBe("#292929");
  });

  test("returns default for XSS attempt", () => {
    expect(sanitizeBrandColor("#FF5733<script>")).toBe("#292929");
  });
});

describe("customTemplate branding variables", () => {
  const baseVariables = {
    eventName: "Test Event",
    organizerName: "Organizer",
    attendeeName: "Attendee",
  };

  test("{ORG_LOGO} renders as img in HTML with valid URL", () => {
    const result = customTemplate(
      "{ORG_LOGO}",
      { ...baseVariables, orgLogoUrl: "https://example.com/logo.png", orgName: "Acme" },
      "en"
    );

    expect(result.text).toBe("");
    expect(result.html).toContain('<img src="https://example.com/logo.png" alt="Acme"');
  });

  test("{ORG_LOGO} is empty for invalid URL", () => {
    const result = customTemplate(
      "{ORG_LOGO}",
      { ...baseVariables, orgLogoUrl: "javascript:alert(1)", orgName: "Acme" },
      "en"
    );

    expect(result.text).toBe("");
    expect(result.html).not.toContain("<img");
  });

  test("{ORG_LOGO} is empty when orgLogoUrl is null", () => {
    const result = customTemplate("{ORG_LOGO}", { ...baseVariables, orgLogoUrl: null }, "en");

    expect(result.text).toBe("");
    expect(result.html).not.toContain("<img");
  });

  test("{ORG_NAME} replaces in both text and HTML", () => {
    const result = customTemplate("{ORG_NAME}", { ...baseVariables, orgName: "Acme Corp" }, "en");

    expect(result.text).toBe("Acme Corp");
    expect(result.html).toContain("Acme Corp");
  });

  test("{ORG_NAME} escapes HTML in HTML output", () => {
    const result = customTemplate("{ORG_NAME}", { ...baseVariables, orgName: "<script>XSS</script>" }, "en");

    expect(result.text).toBe("<script>XSS</script>");
    expect(result.html).toContain("&lt;script&gt;XSS&lt;/script&gt;");
    expect(result.html).not.toContain("<script>");
  });

  test("{BRAND_COLOR} uses valid hex color", () => {
    const result = customTemplate("{BRAND_COLOR}", { ...baseVariables, brandColor: "#FF5733" }, "en");

    expect(result.text).toBe("#FF5733");
    expect(result.html).toContain("#FF5733");
  });

  test("{BRAND_COLOR} falls back to default for invalid color", () => {
    const result = customTemplate("{BRAND_COLOR}", { ...baseVariables, brandColor: "invalid" }, "en");

    expect(result.text).toBe("#292929");
    expect(result.html).toContain("#292929");
  });

  test("branding variables work together", () => {
    const template = "Welcome to {ORG_NAME}! Color: {BRAND_COLOR} {ORG_LOGO}";
    const result = customTemplate(
      template,
      {
        ...baseVariables,
        orgLogoUrl: "https://example.com/logo.png",
        orgName: "Acme",
        brandColor: "#0066FF",
      },
      "en"
    );

    expect(result.text).toBe("Welcome to Acme! Color: #0066FF ");
    expect(result.html).toContain("Welcome to Acme! Color: #0066FF");
    expect(result.html).toContain('<img src="https://example.com/logo.png"');
  });
});
