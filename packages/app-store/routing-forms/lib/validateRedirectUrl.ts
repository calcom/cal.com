/**
 * Validates that field identifier variables (e.g., {name}) are not used in query parameters.
 * Variables should only be used in the URL path, not as query parameters.
 *
 * @param url - The URL string to validate (can be a full URL or just a path)
 * @returns An object with isValid boolean and an optional error message
 */

export const validateVariablesNotInQueryParams = (
  url: string
): {
  isValid: boolean;
  invalidVariables: string[];
} => {
  if (!url) {
    return { isValid: true, invalidVariables: [] };
  }

  const queryStringIndex = url.indexOf("?");
  if (queryStringIndex === -1) {
    return { isValid: true, invalidVariables: [] };
  }

  let queryString = url.substring(queryStringIndex + 1);

  const fragmentIndex = queryString.indexOf("#");
  if (fragmentIndex !== -1) {
    queryString = queryString.substring(0, fragmentIndex);
  }

  const variableRegex = /\{([^}]+)\}/g;
  const matches = queryString.match(variableRegex);

  if (!matches || matches.length === 0) {
    return { isValid: true, invalidVariables: [] };
  }

  const invalidVariables = matches.map((match) => match.slice(1, -1));

  return {
    isValid: false,
    invalidVariables,
  };
};
