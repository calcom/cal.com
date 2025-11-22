/* eslint-disable @typescript-eslint/no-explicit-any */
import { getToken } from "next-auth/jwt";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@calcom/prisma";

import { getLocale } from "./getLocale";

// Mock prisma
vi.mock("@calcom/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
  },
}));

// Mock next-auth/jwt
vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

// Mock i18n config
vi.mock("@calcom/config/next-i18next.config", () => ({
  i18n: {
    locales: ["en", "es", "fr", "de", "pt", "pt-BR", "he", "ar"],
  },
}));

const mockGetToken = getToken as unknown as ReturnType<typeof vi.fn>;
const mockFindFirst = prisma.user.findFirst as unknown as ReturnType<typeof vi.fn>;

describe("getLocale", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("with authenticated session", () => {
    it("should return locale from token when user is authenticated", async () => {
      mockGetToken.mockResolvedValue({ locale: "es" });

      const mockReq = {
        headers: new Headers({ "accept-language": "en-US" }),
        cookies: {},
      } as any;

      const result = await getLocale(mockReq);

      expect(result).toBe("es");
      expect(mockGetToken).toHaveBeenCalled();
      expect(mockFindFirst).not.toHaveBeenCalled();
    });

    it("should prioritize page owner's locale over authenticated visitor's token locale", async () => {
      // This is the key behavior: booking pages ALWAYS show the owner's language
      // Even if the visitor is logged in with a different language preference
      mockGetToken.mockResolvedValue({ locale: "fr" }); // Visitor prefers French
      mockFindFirst.mockResolvedValue({ locale: "he" }); // Page owner prefers Hebrew

      const mockReq = {
        headers: new Headers({ "accept-language": "en-US" }),
        cookies: {},
      } as any;

      const result = await getLocale(mockReq as any, "some-username");

      // Should return page OWNER's locale (Hebrew), not visitor's token locale (French)
      expect(result).toBe("he");
      expect(mockFindFirst).toHaveBeenCalled();
      // Token should NOT be checked when page owner locale is found
      expect(mockGetToken).not.toHaveBeenCalled();
    });
  });

  describe("with username parameter (unauthenticated)", () => {
    it("should fetch and return user locale from database when username is provided", async () => {
      mockGetToken.mockResolvedValue(null);
      mockFindFirst.mockResolvedValue({ locale: "he" });

      const mockReq = {
        headers: new Headers({ "accept-language": "en-US" }),
        cookies: {},
      };

      const result = await getLocale(mockReq as any, "andriy-anthon");

      expect(result).toBe("he");
      // Token should NOT be checked when page owner locale is found
      expect(mockGetToken).not.toHaveBeenCalled();
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { username: "andriy-anthon", locked: false },
        select: { locale: true },
      });
    });

    it("should fall back to English when user has no locale set (locale is null)", async () => {
      mockGetToken.mockResolvedValue(null);
      mockFindFirst.mockResolvedValue({ locale: null });

      const mockReq = {
        headers: new Headers({ "accept-language": "fr-FR" }),
        cookies: {},
      };

      const result = await getLocale(mockReq as any, "some-user");

      // When user exists but locale is null, should default to "en", not fall through to Accept-Language
      expect(result).toBe("en");
      expect(mockFindFirst).toHaveBeenCalled();
      // Token should NOT be checked when user is found
      expect(mockGetToken).not.toHaveBeenCalled();
    });

    it("should fall back to Accept-Language when user is not found", async () => {
      mockGetToken.mockResolvedValue(null);
      mockFindFirst.mockResolvedValue(null);

      const mockReq = {
        headers: new Headers({ "accept-language": "de-DE" }),
        cookies: {},
      } as any;

      const result = await getLocale(mockReq as any, "nonexistent-user");

      expect(result).toBe("de");
      expect(mockFindFirst).toHaveBeenCalled();
    });

    it("should handle database errors gracefully and fall back to Accept-Language", async () => {
      mockGetToken.mockResolvedValue(null);
      mockFindFirst.mockRejectedValue(new Error("Database error"));

      const mockReq = {
        headers: new Headers({ "accept-language": "pt-BR" }),
        cookies: {},
      };

      const result = await getLocale(mockReq as any, "some-user");

      // lookup() transforms pt-BR to pt since both exist in i18n.locales and pt is the base language
      expect(result).toBe("pt");
    });
  });

  describe("without authentication or username (fallback to Accept-Language)", () => {
    it("should return locale from Accept-Language header when no token or username", async () => {
      mockGetToken.mockResolvedValue(null);

      const mockReq = {
        headers: new Headers({ "accept-language": "es-ES,es;q=0.9,en;q=0.8" }),
        cookies: {},
      } as any;

      const result = await getLocale(mockReq as any);

      expect(result).toBe("es");
      expect(mockGetToken).toHaveBeenCalled();
      expect(mockFindFirst).not.toHaveBeenCalled();
    });

    it("should default to 'en' when no Accept-Language header is present", async () => {
      mockGetToken.mockResolvedValue(null);

      const mockReq = {
        headers: new Headers({}),
        cookies: {},
      };

      const result = await getLocale(mockReq as any);

      expect(result).toBe("en");
    });

    it("should handle malformed Accept-Language header", async () => {
      mockGetToken.mockResolvedValue(null);

      const mockReq = {
        headers: new Headers({ "accept-language": "invalid-locale-###" }),
        cookies: {},
      } as any;

      const result = await getLocale(mockReq as any);

      // The function doesn't validate locale format, it just extracts it
      // This may return the malformed value rather than defaulting to 'en'
      expect(result).toBe("invalid-locale");
    });
  });

  describe("RTL languages", () => {
    it("should return 'he' for Hebrew user", async () => {
      mockGetToken.mockResolvedValue(null);
      mockFindFirst.mockResolvedValue({ locale: "he" });

      const mockReq = {
        headers: new Headers({ "accept-language": "en-US" }),
        cookies: {},
      };

      const result = await getLocale(mockReq as any, "hebrew-user");

      expect(result).toBe("he");
    });

    it("should return 'ar' for Arabic user", async () => {
      mockGetToken.mockResolvedValue(null);
      mockFindFirst.mockResolvedValue({ locale: "ar" });

      const mockReq = {
        headers: new Headers({ "accept-language": "en-US" }),
        cookies: {},
      };

      const result = await getLocale(mockReq as any, "arabic-user");

      expect(result).toBe("ar");
    });
  });
});
