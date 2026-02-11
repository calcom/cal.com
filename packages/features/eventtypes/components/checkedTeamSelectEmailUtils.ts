import { isValidEmail } from "@calcom/features/isValidEmail";

import type { CheckedSelectOption } from "./CheckedTeamSelect";

export const getEmailTokens = (value: string) => {
  return value
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
};

export const getValidUniqueEmails = (value: string) => {
  const tokens = getEmailTokens(value);
  return [...new Set(tokens)].filter((token) => isValidEmail(token));
};

export const findOptionByEmail = (options: CheckedSelectOption[], email: string) => {
  return options.find((option) => option.email?.toLowerCase() === email.toLowerCase());
};
