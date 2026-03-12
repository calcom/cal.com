import { describe, expect, it } from "vitest";

import { getTranslation, loadTranslations, mergeWithEnglishFallback } from "./server";

describe("mergeWithEnglishFallback", () => {
  it("should merge locale translations with English fallback", () => {
    const localeTranslations = {
      hello: "Bonjour",
      goodbye: "Au revoir",
      locale_only: "French only text",
    };

    const result = mergeWithEnglishFallback(localeTranslations);

    expect(result.hello).toBe("Bonjour");
    expect(result.goodbye).toBe("Au revoir");
    expect(result.locale_only).toBe("French only text");
    expect(result).toHaveProperty("welcome");
    expect(result).toHaveProperty("cancel");
    expect(Object.keys(result).length).toBeGreaterThan(3);
  });

  it("should use English translations as fallback when locale translations are empty", () => {
    const localeTranslations = {};

    const result = mergeWithEnglishFallback(localeTranslations);

    expect(result).toHaveProperty("welcome");
    expect(result).toHaveProperty("cancel");
    expect(Object.keys(result).length).toBeGreaterThan(100);
  });

  it("should prioritize locale translations over English when keys overlap", () => {
    const localeTranslations = {
      welcome: "Bienvenido",
      cancel: "Cancelar",
    };

    const result = mergeWithEnglishFallback(localeTranslations);

    expect(result.welcome).toBe("Bienvenido");
    expect(result.cancel).toBe("Cancelar");
    expect(Object.keys(result).length).toBeGreaterThan(100);
  });

  it("should handle locale translations with additional keys not in English", () => {
    const localeTranslations = {
      welcome: "Ciao",
      italian_greeting: "Buongiorno",
      italian_phrase: "Come stai?",
    };

    const result = mergeWithEnglishFallback(localeTranslations);

    expect(result.welcome).toBe("Ciao");
    expect(result.italian_greeting).toBe("Buongiorno");
    expect(result.italian_phrase).toBe("Come stai?");
    expect(Object.keys(result).length).toBeGreaterThan(100);
  });
});

describe("loadTranslations", () => {
  it("returns bundled English translations for locale 'en'", async () => {
    const result = await loadTranslations("en", "common");

    expect(result).toHaveProperty("welcome", "Welcome");
    expect(result).toHaveProperty("cancel", "Cancel");
    expect(Object.keys(result).length).toBeGreaterThan(100);
  });

  it("returns French translations merged with English fallback", async () => {
    const result = await loadTranslations("fr", "common");

    expect(result).toHaveProperty("welcome", "Bienvenue");
    expect(result).toHaveProperty("cancel", "Annuler");
    expect(Object.keys(result).length).toBeGreaterThan(100);
  });

  it("aliases 'zh' to 'zh-CN'", async () => {
    const zhResult = await loadTranslations("zh", "common");
    const zhCNResult = await loadTranslations("zh-CN", "common");

    expect(zhResult).toEqual(zhCNResult);
  });

  it("falls back to English for unsupported locales", async () => {
    const result = await loadTranslations("xx-INVALID", "common");

    expect(result).toHaveProperty("welcome", "Welcome");
    expect(result).toHaveProperty("cancel", "Cancel");
  });

  it("throws for nonexistent namespaces instead of silently falling back", async () => {
    await expect(loadTranslations("en", "nonexistent-namespace")).rejects.toThrow();
  });

  it("returns cached result on subsequent calls for the same locale", async () => {
    const first = await loadTranslations("de", "common");
    const second = await loadTranslations("de", "common");

    expect(first).toBe(second);
  });

  it("includes English fallback keys missing from the locale file", async () => {
    const enResult = await loadTranslations("en", "common");
    const frResult = await loadTranslations("fr", "common");

    for (const key of Object.keys(enResult)) {
      expect(frResult).toHaveProperty(key);
    }
  });
});

describe("getTranslation", () => {
  it("returns a function that translates English keys", async () => {
    const t = await getTranslation("en", "common");

    expect(typeof t).toBe("function");
    expect(t("welcome")).toBe("Welcome");
    expect(t("cancel")).toBe("Cancel");
  });

  it("returns a function that translates French keys", async () => {
    const t = await getTranslation("fr", "common");

    expect(t("welcome")).toBe("Bienvenue");
    expect(t("cancel")).toBe("Annuler");
  });

  it("returns the key itself for missing translation keys", async () => {
    const t = await getTranslation("en", "common");

    expect(t("this_key_does_not_exist")).toBe("this_key_does_not_exist");
  });

  it("returns consistent results from cached i18n instance on subsequent calls", async () => {
    const first = await getTranslation("es", "common");
    const second = await getTranslation("es", "common");

    expect(first("welcome")).toBe(second("welcome"));
    expect(first("cancel")).toBe(second("cancel"));
  });

  it("returns different translation functions for different locales", async () => {
    const enT = await getTranslation("en", "common");
    const frT = await getTranslation("fr", "common");

    expect(enT("welcome")).not.toBe(frT("welcome"));
  });
});
