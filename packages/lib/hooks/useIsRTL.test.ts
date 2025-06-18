import { renderHook } from "@testing-library/react-hooks";
import { vi } from "vitest";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { useIsRTL } from "./useIsRTL";

describe("useIsRTL hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset navigator to default English
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
      const { result } = renderHook(() => useIsRTL("ar"));
      
      expect(result.current.isRTL).toBe(true);
      expect(result.current.direction).toBe("rtl");
      expect(result.current.locale).toBe("ar");
      expect(result.current.fontClass).toBe("font-tajawal");
    });

    it("should use Hebrew interface language", () => {
      const { result } = renderHook(() => useIsRTL("he"));
      
      expect(result.current.isRTL).toBe(true);
      expect(result.current.direction).toBe("rtl");
      expect(result.current.locale).toBe("he");
      expect(result.current.fontClass).toBe(""); // No special font for Hebrew
    });

    it("should use English interface language", () => {
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

    it("should handle null interface language", () => {
      vi.stubGlobal('navigator', {
        language: 'en-US'
      });
      
      const { result } = renderHook(() => useIsRTL(null));
      
      expect(result.current.isRTL).toBe(false);
      expect(result.current.direction).toBe("ltr");
      expect(result.current.locale).toBe("en");
      expect(result.current.fontClass).toBe("");
    });
  });

  describe("without interface language parameter", () => {
    it("should fallback to browser language - Arabic", () => {
      vi.stubGlobal('navigator', {
        language: 'ar-SA'
      });
      
      const { result } = renderHook(() => useIsRTL());
      
      expect(result.current.isRTL).toBe(true);
      expect(result.current.direction).toBe("rtl");
      expect(result.current.locale).toBe("ar");
      expect(result.current.fontClass).toBe("font-tajawal");
    });

    it("should fallback to browser language - English", () => {
      vi.stubGlobal('navigator', {
        language: 'en-US'
      });
      
      const { result } = renderHook(() => useIsRTL());
      
      expect(result.current.isRTL).toBe(false);
      expect(result.current.direction).toBe("ltr");
      expect(result.current.locale).toBe("en");
      expect(result.current.fontClass).toBe("");
    });

    it("should default to English when no browser language available", () => {
      vi.stubGlobal('navigator', undefined);
      
      const { result } = renderHook(() => useIsRTL());
      
      expect(result.current.locale).toBe("en");
      expect(result.current.isRTL).toBe(false);
    });
  });

  describe("empty interface language parameter", () => {
    it("should fallback to browser language when interface language is empty string", () => {
      vi.stubGlobal('navigator', {
        language: 'ar-EG'
      });
      
      const { result } = renderHook(() => useIsRTL(""));
      
      expect(result.current.isRTL).toBe(true);
      expect(result.current.direction).toBe("rtl");
      expect(result.current.locale).toBe("ar");
      expect(result.current.fontClass).toBe("font-tajawal");
    });

    it("should fallback to default when no browser language available", () => {
      vi.stubGlobal('navigator', undefined);

      const { result } = renderHook(() => useIsRTL(""));
      
      // Should fallback to default locale
      expect(result.current.locale).toBe("en");
      expect(result.current.isRTL).toBe(false);
      expect(result.current.fontClass).toBe("");
    });
  });

  describe("error handling and fallbacks", () => {
    it("should fallback to 'en' when no browser language available", () => {
      // Mock server environment (no navigator)
      vi.stubGlobal('navigator', undefined);

      const { result } = renderHook(() => useIsRTL());
      
      expect(result.current.locale).toBe("en");
      expect(result.current.isRTL).toBe(false);
      expect(result.current.fontClass).toBe("");
    });

    it("should fallback to 'en' when browser language is invalid", () => {
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