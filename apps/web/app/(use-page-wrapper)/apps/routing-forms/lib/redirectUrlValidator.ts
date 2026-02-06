/**
 * Validates slugs in URL (e.g., {name}) that has variable parameters (e.g., {name?={{user}}}).
 */

import { WEBSITE_URL } from "@calcom/lib/constants";

interface ValidationResult {
  isValid: boolean;
  invalidVariables: string[];
}

export const redirectUrlValidator = (
  url: string
): ValidationResult => {
  if (!url) {
    return { isValid: true, invalidVariables: [] };
  }

  try {
    const urlObj = new URL(url, WEBSITE_URL);
    const queryString = decodeURIComponent(urlObj.search.slice(1));

    if (!queryString) {
      return { isValid: true, invalidVariables: [] };
    }

    const variableRegex = /\{([^}]*)\}/g;
    const matches = queryString.match(variableRegex);

    if (!matches || matches.length === 0) {
      return { isValid: true, invalidVariables: [] };
    }

    const invalidVariables = matches.map((match) => match.slice(1, -1));

    return {
      isValid: false,
      invalidVariables,
    };
  } catch {
    return { isValid: true, invalidVariables: [] };
  }
};