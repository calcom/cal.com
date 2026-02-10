import { describe, expect, it } from "vitest";

import { mergeWithEnglishFallback } from "./i18n";

describe("mergeWithEnglishFallback", () => {
  it("should merge locale translations with English fallback", () => {
    const localeTranslations = {
      // Override some existing English keys
      hello: "Bonjour",
      goodbye: "Au revoir",
      // Add new locale-specific keys
      locale_only: "French only text",
    };

    const result = mergeWithEnglishFallback(localeTranslations);

    // Check that locale translations override English
    expect(result.hello).toBe("Bonjour");
    expect(result.goodbye).toBe("Au revoir");

    // Check that locale-specific keys are preserved
    expect(result.locale_only).toBe("French only text");

    // Check that English fallback keys are present (using actual keys from the real file)
    expect(result).toHaveProperty("welcome");
    expect(result).toHaveProperty("cancel");

    // Verify the structure - should have both English and locale keys
    expect(Object.keys(result)).toContain("hello"); // overridden
    expect(Object.keys(result)).toContain("locale_only"); // locale-specific
    expect(Object.keys(result).length).toBeGreaterThan(3); // Should have many keys from English
  });

  it("should use English translations as fallback when locale translations are empty", () => {
    const localeTranslations = {};

    const result = mergeWithEnglishFallback(localeTranslations);

    // Should return all English translations
    expect(result).toHaveProperty("welcome");
    expect(result).toHaveProperty("cancel");
    expect(Object.keys(result).length).toBeGreaterThan(100); // English file has many keys
  });

  it("should prioritize locale translations over English when keys overlap", () => {
    const localeTranslations = {
      welcome: "Bienvenido",
      cancel: "Cancelar",
    };

    const result = mergeWithEnglishFallback(localeTranslations);

    // Spanish should override English
    expect(result.welcome).toBe("Bienvenido");
    expect(result.cancel).toBe("Cancelar");

    // Should still have other English keys
    expect(Object.keys(result).length).toBeGreaterThan(100);
  });

  it("should handle locale translations with additional keys not in English", () => {
    const localeTranslations = {
      // Override existing English key
      welcome: "Ciao",
      // Add new keys not in English
      italian_greeting: "Buongiorno",
      italian_phrase: "Come stai?",
    };

    const result = mergeWithEnglishFallback(localeTranslations);

    // Check overridden key
    expect(result.welcome).toBe("Ciao");

    // Check Italian-specific keys
    expect(result.italian_greeting).toBe("Buongiorno");
    expect(result.italian_phrase).toBe("Come stai?");

    // Should have English keys plus the new Italian ones
    expect(Object.keys(result).length).toBeGreaterThan(100);
    expect(Object.keys(result)).toContain("italian_greeting");
    expect(Object.keys(result)).toContain("italian_phrase");
  });
});
