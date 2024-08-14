export enum BookingLanguage {
  "en" = "en",
  "lv" = "lv",
}

export type BookingLanguageType = keyof typeof BookingLanguage;
