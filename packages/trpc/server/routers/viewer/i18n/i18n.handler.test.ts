import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-i18next/serverSideTranslations", () => ({
  serverSideTranslations: vi.fn(),
}));

import { i18nHandler } from "./i18n.handler";

describe("i18n handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("passes i18n config to serverSideTranslations", async () => {
    const { serverSideTranslations } = await import("next-i18next/serverSideTranslations");
    const mockedSST = vi.mocked(serverSideTranslations);

    const fakeResult = {
      _nextI18Next: {
        initialLocale: "en",
        ns: ["common", "vital"],
      },
    };
    mockedSST.mockResolvedValueOnce(fakeResult);

    const result = await i18nHandler({ input: { locale: "en", CalComVersion: "1.0" } });

    expect(mockedSST).toHaveBeenCalledOnce();
    const [locale, namespaces, config] = mockedSST.mock.calls[0];
    expect(locale).toBe("en");
    expect(namespaces).toEqual(["common", "vital"]);
    expect(config).toBeDefined();
    expect(config).toHaveProperty("i18n");
    expect(config).toHaveProperty("localePath");
    expect(result.i18n).toBe(fakeResult);
    expect(result.locale).toBe("en");
  });

  it("passes the locale from input to serverSideTranslations", async () => {
    const { serverSideTranslations } = await import("next-i18next/serverSideTranslations");
    const mockedSST = vi.mocked(serverSideTranslations);

    mockedSST.mockResolvedValueOnce({
      _nextI18Next: {
        initialLocale: "fr",
        ns: ["common", "vital"],
      },
    });

    const result = await i18nHandler({ input: { locale: "fr", CalComVersion: "1.0" } });

    expect(mockedSST.mock.calls[0][0]).toBe("fr");
    expect(result.locale).toBe("fr");
  });
});
