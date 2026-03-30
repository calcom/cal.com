/**
 * Custom phone masks to override outdated masks in react-phone-input-2.
 * The library's built-in masks can lag behind countries' numbering plan changes,
 * causing valid phone numbers to be truncated (users can't type enough digits).
 *
 * Each dot (.) represents a digit placeholder. When a country updates its
 * numbering plan to use longer numbers, add an override here.
 */
export const CUSTOM_PHONE_MASKS = {
  /** Ivory Coast: migrated from 8 to 10 digits in 2021 */
  ci: ".. .. .. .. ..",
  /** Benin: migrated from 8 to 10 digits in 2025 */
  bj: ".. .. .. .. ..",
  /** Austria: variable-length numbers up to 13 digits */
  at: "... ..........",
  /** Argentina: mobile numbers require 11 national digits (9 + area code + subscriber) */
  ar: "(..) .........",
  /** Finland: some mobile numbers use 10 national digits */
  fi: ".. ... .. ...",
};
