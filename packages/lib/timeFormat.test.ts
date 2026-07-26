import { describe, expect, it } from "vitest";

import { resolveIs24h } from "./timeFormat";

describe("fn: resolveIs24h", () => {
  it("should detect 24-hour locales", () => {
    for (const locale of ["de-DE", "fr-FR", "ja-JP", "pl-PL", "ru-RU", "sv-SE"]) {
      expect(resolveIs24h(locale), locale).toBe(true);
    }
  });

  it("should detect 12-hour locales that use Latin AM/PM", () => {
    for (const locale of ["en-US", "en-AU", "ko-KR"]) {
      expect(resolveIs24h(locale), locale).toBe(false);
    }
  });

  it("should detect 12-hour locales whose day period is not written in Latin script", () => {
    // The previous implementation sniffed the formatted output for the letter
    // "M", so these came back as 24-hour:
    //   ar    "9 ص"
    //   el    "9 π.μ."
    //   zh-TW "上午9時"
    for (const locale of ["ar", "el", "zh-TW"]) {
      expect(resolveIs24h(locale), locale).toBe(false);
    }
  });

  it("should agree with what Intl itself reports, for every locale this repo ships", () => {
    // Guards against any future locale being added with the same class of bug.
    const locales = [
      "ar", "az", "bg", "bn", "ca", "cs", "da", "de", "el", "en", "es", "es-419", "et", "eu",
      "fi", "fr", "he", "hr", "hu", "id", "it", "ja", "km", "ko", "nl", "no", "pl", "pt", "pt-BR",
      "ro", "ru", "sk", "sr", "sv", "ta", "te", "tr", "uk", "vi", "zh-CN", "zh-TW",
    ];

    for (const locale of locales) {
      const resolved = new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions();

      expect(resolveIs24h(locale), locale).toBe(!resolved.hour12);
    }
  });

  it("should fall back to the browser locale when none is given", () => {
    const resolved = new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions();

    expect(resolveIs24h()).toBe(!resolved.hour12);
  });
});
