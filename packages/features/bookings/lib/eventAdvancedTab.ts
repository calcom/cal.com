import { supportedLanguages, getDefaultLanguage } from './advancedsetting';

// Example usage within the component
const defaultLanguage = getDefaultLanguage();
const availableLanguages = supportedLanguages;

// Integrate these settings into your form or component logic as needed

// advancedsetting.ts
export const supportedLanguages = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  // Add more languages as needed
];

export const getDefaultLanguage = () => {
  // Logic to determine the default language
  return 'en';
};
