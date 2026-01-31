import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { mergeWithEnglishFallback, loadTranslations } from "./i18n";

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

  describe("with booking namespace", () => {
    it("should use booking namespace English translations when ns is 'booking'", () => {
      const localeTranslations = {
        nameless_team: "Equipo sin nombre",
      };

      const result = mergeWithEnglishFallback(localeTranslations, "booking");

      expect(result.nameless_team).toBe("Equipo sin nombre");
      expect(result).toHaveProperty("book_a_team_member");
      expect(result).toHaveProperty("round_robin");
      expect(result).toHaveProperty("collective");
    });

    it("should fallback to common namespace English translations for unknown namespace", () => {
      const localeTranslations = {};

      const result = mergeWithEnglishFallback(localeTranslations, "unknown_namespace");

      expect(result).toHaveProperty("welcome");
      expect(result).toHaveProperty("cancel");
    });

    it("should use common namespace by default when ns is not provided", () => {
      const localeTranslations = {};

      const result = mergeWithEnglishFallback(localeTranslations);

      expect(result).toHaveProperty("welcome");
      expect(result).toHaveProperty("cancel");
      expect(Object.keys(result).length).toBeGreaterThan(100);
    });
  });
});

describe("loadTranslations", () => {
  it("should load English translations for 'en' locale with common namespace", async () => {
    const translations = await loadTranslations("en", "common");

    expect(translations).toHaveProperty("welcome");
    expect(translations).toHaveProperty("cancel");
    expect(Object.keys(translations).length).toBeGreaterThan(100);
  });

  it("should load English translations for 'en' locale with booking namespace", async () => {
    const translations = await loadTranslations("en", "booking");

    expect(translations).toHaveProperty("nameless_team");
    expect(translations).toHaveProperty("book_a_team_member");
    expect(translations).toHaveProperty("round_robin");
    expect(translations).toHaveProperty("collective");
    expect(translations).toHaveProperty("team_is_unpublished");
  });

  it("should fallback to common namespace for unsupported namespace", async () => {
    const translations = await loadTranslations("en", "invalid_namespace");

    expect(translations).toHaveProperty("welcome");
    expect(translations).toHaveProperty("cancel");
  });

  it("should normalize 'zh' locale to 'zh-CN'", async () => {
    const translations = await loadTranslations("zh", "common");

    expect(translations).toHaveProperty("welcome");
  });

  it("should fallback to English for unsupported locale", async () => {
    const translations = await loadTranslations("unsupported_locale", "common");

    expect(translations).toHaveProperty("welcome");
    expect(translations).toHaveProperty("cancel");
  });

  it("should cache translations and return same result on subsequent calls", async () => {
    const firstCall = await loadTranslations("en", "booking");
    const secondCall = await loadTranslations("en", "booking");

    expect(firstCall).toBe(secondCall);
  });
});
