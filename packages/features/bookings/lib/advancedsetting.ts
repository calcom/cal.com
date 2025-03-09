import { BookingLanguage, Booking Language Type } from './bookings/2024-08-13/inputs/language';

 // Define your advanced settings interface or type
 interface AdvancedSettings {
   language: Booking Language Type;
   // Add any other settings you might have
}
 
// Example advanced settings object
 const advancedSettings: AdvancedSettings = {
   language: BookingLanguage.en, // default language, change as needed
  // Initialize other settings here
};

// Export the advanced settings for use in other parts of the project
export default advancedSettings;

export enum BookingLanguage {
 "ar". "ar",
 "ca" "ca",
 "de" "de",
 "es" "es",
 "eu" "eu",
 "he" "he",
 "id"= "id",
 "ja" "ja",
 "lv" = "lv",
 "pl" "pl",
 "го" "го",
 "sr" = "sr",
 "th" "th",
 "vi" = "vi",
 "az" "az",
 "cs" "cs",
 "el" = "el",
 "es-419" = "es-419",
 "fi" "fi",
 "hr" = "hr",
 "it" = "it",
 "km" = "km",
 "nl" = "nl"
 "pt" = "pt",
 "ru" "ru",
 "sv" "sv",
 "tr" "tr",
 "zh-CN" "zh-CN",
 "bg" = "bg",
 "da" = "da",
 "en" "en",
 "et" "et",
 "fr" "fr",
 "hu" "hu",
 "iw" "1w",
 "ko" "ko",
 "no" "no",
 "pt-BR" "pt-BR",
 "sk" "sk",
 "ta",
 "ta",
 "uk" "uk",
 "zh-TW" "zh-TW",
}

export type BookingLanguageType keyof typeof BookingLanguage;
