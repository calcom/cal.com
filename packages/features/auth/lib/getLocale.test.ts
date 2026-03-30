import { describe, it, expect, vi } from "vitest";

vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

vi.mock("@calcom/i18n/next-i18next.config", () => ({
  i18n: { locales: ["en", "es", "fr", "de", "pt-BR"] },
}));

import { getLocale } from "./getLocale";
import { getToken } from "next-auth/jwt";

describe("getLocale", () => {
  it("returns token locale when present", async () => {
    vi.mocked(getToken).mockResolvedValue({ locale: "fr" } as any);
    const req = { headers: new Headers({ "accept-language": "en-US" }), cookies: {} } as any;
    const result = await getLocale(req);
    expect(result).toBe("fr");
  });

  it("falls back to accept-language header when no token locale", async () => {
    vi.mocked(getToken).mockResolvedValue({} as any);
    const req = { headers: new Headers({ "accept-language": "es" }), cookies: {} } as any;
    const result = await getLocale(req);
    expect(result).toBe("es");
  });
});
