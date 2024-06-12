import { WEBAPP_URL } from "@calcom/lib/constants";

export function getHref(
  baseURL: string,
  activeSettingsOption: { credentialId: string; activeOption: string }
) {
  const baseUrlParsed = new URL(baseURL, WEBAPP_URL);
  baseUrlParsed.searchParams.set(activeSettingsOption.credentialId, activeSettingsOption.activeOption);
  return baseUrlParsed.toString();
}

function getPropertyByPath(obj, path) {
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current[part] === undefined) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

export function flattenObject(obj) {
  const flattened = {};

  Object.keys(obj).forEach((key) => {
    let searchNext = [key];
    while (searchNext.length > 0) {
      const discovered = [];

      searchNext.forEach((key) => {
        const value = getPropertyByPath(obj, key);
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          discovered.push(...Object.keys(value).map((value) => `${key}.${value}`));
        } else {
          flattened[key] = value;
        }
      });

      searchNext = discovered;
    }
  });

  return flattened;
}
