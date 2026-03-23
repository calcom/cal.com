import { describe, expect, it } from "vitest";

import { APP_CATEGORIES, VALID_CATEGORY_VALUES } from "./constants";
import { validateCreateAppFlags } from "./validateCreateAppFlags";

const VALID_TEMPLATES = [
  "basic",
  "booking-pages-tag",
  "event-type-app-card",
  "event-type-location-video-static",
  "general-app-settings",
  "link-as-an-app",
];

describe("validateCreateAppFlags", () => {
  describe("template validation", () => {
    it("returns error when template is empty", () => {
      const result = validateCreateAppFlags({
        template: "",
        category: "other",
        validTemplateValues: VALID_TEMPLATES,
      });
      expect(result).toContain("--template is required in non-interactive mode");
      expect(result).toContain("basic");
    });

    it("returns error for invalid template", () => {
      const result = validateCreateAppFlags({
        template: "nonexistent-template",
        category: "other",
        validTemplateValues: VALID_TEMPLATES,
      });
      expect(result).toContain("Invalid template: nonexistent-template");
      expect(result).toContain("Available templates:");
    });

    it("accepts all valid templates", () => {
      for (const template of VALID_TEMPLATES) {
        const result = validateCreateAppFlags({
          template,
          category: "other",
          externalLinkUrl: template === "link-as-an-app" ? "https://example.com" : undefined,
          validTemplateValues: VALID_TEMPLATES,
        });
        expect(result).toBeNull();
      }
    });
  });

  describe("category validation", () => {
    it("returns error for invalid category", () => {
      const result = validateCreateAppFlags({
        template: "basic",
        category: "invalid-category",
        validTemplateValues: VALID_TEMPLATES,
      });
      expect(result).toContain("Invalid category: invalid-category");
      expect(result).toContain("Available categories:");
    });

    it("accepts all valid categories", () => {
      for (const category of VALID_CATEGORY_VALUES) {
        const result = validateCreateAppFlags({
          template: "basic",
          category,
          validTemplateValues: VALID_TEMPLATES,
        });
        expect(result).toBeNull();
      }
    });
  });

  describe("link-as-an-app external URL validation", () => {
    it("returns error when link-as-an-app template is used without external URL", () => {
      const result = validateCreateAppFlags({
        template: "link-as-an-app",
        category: "other",
        validTemplateValues: VALID_TEMPLATES,
      });
      expect(result).toBe("--external-link-url is required when using the link-as-an-app template.");
    });

    it("returns error when externalLinkUrl is empty string for link-as-an-app", () => {
      const result = validateCreateAppFlags({
        template: "link-as-an-app",
        category: "other",
        externalLinkUrl: "",
        validTemplateValues: VALID_TEMPLATES,
      });
      expect(result).toBe("--external-link-url is required when using the link-as-an-app template.");
    });

    it("accepts link-as-an-app with valid external URL", () => {
      const result = validateCreateAppFlags({
        template: "link-as-an-app",
        category: "other",
        externalLinkUrl: "https://example.com",
        validTemplateValues: VALID_TEMPLATES,
      });
      expect(result).toBeNull();
    });

    it("does not require external URL for non-link-as-an-app templates", () => {
      const result = validateCreateAppFlags({
        template: "basic",
        category: "other",
        validTemplateValues: VALID_TEMPLATES,
      });
      expect(result).toBeNull();
    });
  });

  describe("valid inputs", () => {
    it("returns null for basic template with valid category", () => {
      const result = validateCreateAppFlags({
        template: "basic",
        category: "analytics",
        validTemplateValues: VALID_TEMPLATES,
      });
      expect(result).toBeNull();
    });

    it("returns null for link-as-an-app with external URL", () => {
      const result = validateCreateAppFlags({
        template: "link-as-an-app",
        category: "conferencing",
        externalLinkUrl: "https://x.com/calcom",
        validTemplateValues: VALID_TEMPLATES,
      });
      expect(result).toBeNull();
    });
  });

  describe("validation order", () => {
    it("checks template before category", () => {
      const result = validateCreateAppFlags({
        template: "",
        category: "invalid",
        validTemplateValues: VALID_TEMPLATES,
      });
      expect(result).toContain("--template is required");
    });

    it("checks category before external URL", () => {
      const result = validateCreateAppFlags({
        template: "link-as-an-app",
        category: "invalid",
        validTemplateValues: VALID_TEMPLATES,
      });
      expect(result).toContain("Invalid category");
    });
  });
});

describe("constants", () => {
  it("APP_CATEGORIES contains expected categories", () => {
    const values = APP_CATEGORIES.map((c) => c.value);
    expect(values).toContain("analytics");
    expect(values).toContain("automation");
    expect(values).toContain("calendar");
    expect(values).toContain("conferencing");
    expect(values).toContain("crm");
    expect(values).toContain("messaging");
    expect(values).toContain("payment");
    expect(values).toContain("other");
  });

  it("APP_CATEGORIES has label and value for each entry", () => {
    for (const cat of APP_CATEGORIES) {
      expect(cat).toHaveProperty("label");
      expect(cat).toHaveProperty("value");
      expect(typeof cat.label).toBe("string");
      expect(typeof cat.value).toBe("string");
    }
  });

  it("VALID_CATEGORY_VALUES matches APP_CATEGORIES values", () => {
    expect(VALID_CATEGORY_VALUES).toEqual(APP_CATEGORIES.map((c) => c.value));
  });
});
