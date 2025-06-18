import { renderHook } from "@testing-library/react-hooks";
import { vi } from "vitest";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { useIsRTL } from "./useIsRTL";

// Mock next/router
const mockRouter = {
  locale: "en",
  defaultLocale: "en",
  push: vi.fn(),
  pathname: "/",
  query: {},
  asPath: "/",
};

vi.mock("next/router", () => ({
  useRouter: vi.fn(() => mockRouter),
}));

// Mock useRouter
const mockUseRouter = vi.mocked(vi.fn(() => mockRouter));
vi.mocked(vi.doMock("next/router", () => ({
  useRouter: mockUseRouter,
})));

describe("useIsRTL hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter);
    
    // Reset router locale
    mockRouter.locale = "en";
    mockRouter.defaultLocale = "en";
    
    // Reset navigator
    vi.stubGlobal('navigator', {
      language: 'en-US'
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("with interface language parameter", () => {
    it("should use Arabic interface language", () => {
      mockRouter.locale = "en"; // Router is English
      const { result } = renderHook(() => useIsRTL("ar"));
      
      expect(result.current.isRTL).toBe(true);
      expect(result.current.direction).toBe("rtl");
      expect(result.current.locale).toBe("ar");
      expect(result.current.fontClass).toBe("font-tajawal");
    });

    it("should use Hebrew interface language", () => {
      mockRouter.locale = "en"; // Router is English
      const { result } = renderHook(() => useIsRTL("he"));
      
      expect(result.current.isRTL).toBe(true);
      expect(result.current.direction).toBe("rtl");
      expect(result.current.locale).toBe("he");
      expect(result.current.fontClass).toBe(""); // No special font for Hebrew
    });

    it("should use English interface language", () => {
      mockRouter.locale = "ar"; // Router is Arabic
      const { result } = renderHook(() => useIsRTL("en"));
      
      expect(result.current.isRTL).toBe(false);
      expect(result.current.direction).toBe("ltr");
      expect(result.current.locale).toBe("en");
      expect(result.current.fontClass).toBe("");
    });

    it("should handle Arabic regional variants", () => {
      const { result } = renderHook(() => useIsRTL("ar-SA"));
      
      expect(result.current.isRTL).toBe(true);
      expect(result.current.direction).toBe("rtl");
      expect(result.current.locale).toBe("ar-SA");
      expect(result.current.fontClass).toBe("font-tajawal");
    });
  });

  describe("without interface language parameter", () => {
    it("should detect RTL from router locale - Arabic", () => {
      mockRouter.locale = "ar";
      const { result } = renderHook(() => useIsRTL());
      
      expect(result.current.isRTL).toBe(true);
      expect(result.current.direction).toBe("rtl");
      expect(result.current.locale).toBe("ar");
      expect(result.current.fontClass).toBe("font-tajawal");
    });

    it("should detect LTR from router locale - English", () => {
      mockRouter.locale = "en";
      const { result } = renderHook(() => useIsRTL());
      
      expect(result.current.isRTL).toBe(false);
      expect(result.current.direction).toBe("ltr");
      expect(result.current.locale).toBe("en");
      expect(result.current.fontClass).toBe("");
    });

    it("should use defaultLocale when locale is undefined", () => {
      mockRouter.locale = undefined as any;
      mockRouter.defaultLocale = "ar";
      const { result } = renderHook(() => useIsRTL());
      
      expect(result.current.locale).toBe("ar");
      expect(result.current.isRTL).toBe(true);
    });
  });

  describe("empty interface language parameter", () => {
    it("should fallback to router locale when interface language is empty string", () => {
      mockRouter.locale = "ar";
      const { result } = renderHook(() => useIsRTL(""));
      
      expect(result.current.isRTL).toBe(true);
      expect(result.current.direction).toBe("rtl");
      expect(result.current.locale).toBe("ar");
      expect(result.current.fontClass).toBe("font-tajawal");
    });

    it("should fallback to default when router fails", () => {
      // Mock router to throw error
      mockUseRouter.mockImplementation(() => {
        throw new Error("Router not mounted");
      });

      const { result } = renderHook(() => useIsRTL(""));
      
      // Should fallback to default locale
      expect(result.current.locale).toBe("en");
      expect(result.current.isRTL).toBe(false);
      expect(result.current.fontClass).toBe("");
    });
  });

  describe("error handling and fallbacks", () => {
    it("should fallback to 'en' when router fails and no browser language available", () => {
      mockUseRouter.mockImplementation(() => {
        throw new Error("Router not mounted");
      });

      // Mock server environment (no navigator)
      vi.stubGlobal('navigator', undefined);

      const { result } = renderHook(() => useIsRTL());
      
      expect(result.current.locale).toBe("en");
      expect(result.current.isRTL).toBe(false);
      expect(result.current.fontClass).toBe("");
    });

    it("should fallback to 'en' when browser language is invalid", () => {
      mockUseRouter.mockImplementation(() => {
        throw new Error("Router not mounted");
      });

      // Mock navigator with empty language
      vi.stubGlobal('navigator', {
        language: ''
      });

      const { result } = renderHook(() => useIsRTL(""));
      
      expect(result.current.locale).toBe("en");
      expect(result.current.isRTL).toBe(false);
    });
  });

  describe("font class logic", () => {
    it("should return font-tajawal for Arabic locales", () => {
      const arabicLocales = ["ar", "ar-SA", "ar-EG", "ar-AE"];
      
      arabicLocales.forEach(locale => {
        const { result } = renderHook(() => useIsRTL(locale));
        expect(result.current.fontClass).toBe("font-tajawal");
      });
    });

    it("should return empty string for non-Arabic locales", () => {
      const nonArabicLocales = ["he", "he-IL", "en", "fr", "de", "es"];
      
      nonArabicLocales.forEach(locale => {
        const { result } = renderHook(() => useIsRTL(locale));
        expect(result.current.fontClass).toBe("");
      });
    });
  });

  describe("development logging", () => {
    it("should log in development environment", () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      // Mock development environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      renderHook(() => useIsRTL("ar"));
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'RTL Hook - Locale:', 'ar', 'Should use Tajawal:', true
      );
      
      // Restore
      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });

    it("should not log in production environment", () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      renderHook(() => useIsRTL("ar"));
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      // Restore
      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });
  });

  describe("memoization behavior", () => {
    it("should memoize results based on locale", () => {
      const { result, rerender } = renderHook(
        ({ locale }) => useIsRTL(locale),
        { initialProps: { locale: "ar" } }
      );
      
      const firstResult = result.current;
      
      // Rerender with same locale
      rerender({ locale: "ar" });
      
      // Should return same object references (memoized)
      expect(result.current.isRTL).toBe(firstResult.isRTL);
      expect(result.current.direction).toBe(firstResult.direction);
      expect(result.current.fontClass).toBe(firstResult.fontClass);
    });

    it("should update when locale changes", () => {
      const { result, rerender } = renderHook(
        ({ locale }) => useIsRTL(locale),
        { initialProps: { locale: "ar" } }
      );
      
      expect(result.current.isRTL).toBe(true);
      expect(result.current.fontClass).toBe("font-tajawal");
      
      // Change locale
      rerender({ locale: "en" });
      
      expect(result.current.isRTL).toBe(false);
      expect(result.current.fontClass).toBe("");
    });
  });
});