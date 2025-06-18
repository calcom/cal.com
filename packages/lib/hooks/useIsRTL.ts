import { useMemo } from "react";

import { isRTLLanguage, getTextDirection } from "../isRTL";

/**
 * Hook to detect if the current locale is RTL
 * @param interfaceLanguage - Optional interface language from event data
 * @returns Object with RTL detection utilities
 */
export function useIsRTL(interfaceLanguage?: string | null) {
  const locale = useMemo(() => {
    // Handle interface language from event data
    if (interfaceLanguage && interfaceLanguage !== "") {
      // Use specific interface language (e.g., "ar", "he")
      return interfaceLanguage;
    }
    
    // Fall back to browser language when no interface language is provided
    if (typeof window !== "undefined" && window.navigator) {
      // Extract language code from browser language (e.g., "ar-SA" → "ar")
      return window.navigator.language.split('-')[0] || "en";
    }
    
    // Default fallback
    return "en";
  }, [interfaceLanguage]);

  const isRTL = useMemo(() => isRTLLanguage(locale), [locale]);
  const direction = useMemo(() => getTextDirection(locale), [locale]);
  const fontClass = useMemo(() => {
    // Apply Tajawal font for Arabic language
    const shouldUseTajawal = locale.startsWith('ar');
    if (process.env.NODE_ENV === 'development') {
      console.log('RTL Hook - Locale:', locale, 'Should use Tajawal:', shouldUseTajawal);
    }
    return shouldUseTajawal ? 'font-tajawal' : '';
  }, [locale]);

  return {
    isRTL,
    direction,
    locale,
    fontClass,
  };
}