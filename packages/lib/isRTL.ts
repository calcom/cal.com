/**
 * RTL (Right-to-Left) language detection and utilities for Cal.com
 * 
 * This module provides utilities to detect RTL languages and apply
 * appropriate styling for booking pages and components.
 */

// List of RTL language codes supported by Cal.com
export const RTL_LANGUAGES = [
  'ar',    // Arabic
  'he',    // Hebrew  
  'iw',    // Hebrew (alternative code)
  'fa',    // Persian/Farsi (future support)
  'ur',    // Urdu (future support)
] as const;

export type RTLLanguage = typeof RTL_LANGUAGES[number];

/**
 * Checks if a given locale is an RTL language
 * @param locale - The locale string (e.g., 'ar', 'en', 'he')
 * @returns boolean indicating if the locale is RTL
 */
export function isRTLLanguage(locale: string): boolean {
  if (!locale) return false;
  
  // Extract language code from locale (e.g., 'ar-SA' -> 'ar')
  const languageCode = locale.split('-')[0].toLowerCase();
  
  return RTL_LANGUAGES.includes(languageCode as RTLLanguage);
}

/**
 * Gets the text direction for a given locale
 * @param locale - The locale string
 * @returns 'rtl' for RTL languages, 'ltr' for others
 */
export function getTextDirection(locale: string): 'rtl' | 'ltr' {
  return isRTLLanguage(locale) ? 'rtl' : 'ltr';
}

/**
 * Generates RTL-aware CSS classes using Tailwind utilities
 * @param locale - The current locale
 * @param baseClasses - Base CSS classes
 * @param rtlClasses - Additional classes to apply for RTL (optional)
 * @returns Combined class string
 */
export function rtlClassNames(
  locale: string,
  baseClasses: string,
  rtlClasses?: string
): string {
  const isRTL = isRTLLanguage(locale);
  
  if (isRTL && rtlClasses) {
    return `${baseClasses} ${rtlClasses}`;
  }
  
  return baseClasses;
}

/**
 * Gets appropriate directional classes for margins and padding
 * Automatically swaps left/right properties for RTL languages
 * @param locale - The current locale
 * @param ltrClasses - Classes for LTR layout (e.g., 'ml-4 mr-2')
 * @param rtlClasses - Classes for RTL layout (e.g., 'mr-4 ml-2') - optional, will auto-swap if not provided
 * @returns Appropriate classes for the current direction
 */
export function directionalClasses(
  locale: string,
  ltrClasses: string,
  rtlClasses?: string
): string {
  const isRTL = isRTLLanguage(locale);
  
  if (!isRTL) {
    return ltrClasses;
  }
  
  // If RTL classes are explicitly provided, use them
  if (rtlClasses) {
    return rtlClasses;
  }
  
  // Auto-swap left/right classes for RTL
  return autoSwapDirectionalClasses(ltrClasses);
}

/**
 * Automatically swaps left/right directional classes
 * @param classes - CSS classes string
 * @returns Classes with left/right swapped
 */
function autoSwapDirectionalClasses(classes: string): string {
  return classes
    .split(' ')
    .map(cls => {
      // Swap margin classes
      if (cls.includes('ml-')) return cls.replace('ml-', 'mr-');
      if (cls.includes('mr-')) return cls.replace('mr-', 'ml-');
      
      // Swap padding classes  
      if (cls.includes('pl-')) return cls.replace('pl-', 'pr-');
      if (cls.includes('pr-')) return cls.replace('pr-', 'pl-');
      
      // Swap border classes
      if (cls.includes('border-l')) return cls.replace('border-l', 'border-r');
      if (cls.includes('border-r')) return cls.replace('border-r', 'border-l');
      
      // Swap rounded classes
      if (cls.includes('rounded-l')) return cls.replace('rounded-l', 'rounded-r');
      if (cls.includes('rounded-r')) return cls.replace('rounded-r', 'rounded-l');
      
      // Swap corner-specific rounded classes
      if (cls.includes('rounded-tl')) return cls.replace('rounded-tl', 'rounded-tr');
      if (cls.includes('rounded-tr')) return cls.replace('rounded-tr', 'rounded-tl');
      if (cls.includes('rounded-bl')) return cls.replace('rounded-bl', 'rounded-br');
      if (cls.includes('rounded-br')) return cls.replace('rounded-br', 'rounded-bl');
      
      // Swap text alignment (including responsive variants)
      if (cls.includes('text-left')) return cls.replace('text-left', 'text-right');
      if (cls.includes('text-right')) return cls.replace('text-right', 'text-left');
      
      // Return unchanged if no directional property found
      return cls;
    })
    .join(' ');
}

/**
 * Returns appropriate transform classes for RTL layout
 * Useful for icons and elements that need mirroring
 * @param locale - The current locale
 * @param mirrorInRTL - Whether to mirror the element in RTL (default: false)
 * @returns Transform classes
 */
export function rtlTransform(locale: string, mirrorInRTL = false): string {
  const isRTL = isRTLLanguage(locale);
  
  if (isRTL && mirrorInRTL) {
    return 'scale-x-[-1]'; // Mirror horizontally
  }
  
  return '';
}