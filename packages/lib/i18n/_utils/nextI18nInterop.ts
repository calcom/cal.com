export const nextI18nInterop = (messages: Record<string, string>): void => {
  // next-intl uses {value} for interpolation, whilst next-i18n uses {{value}}
  for (const [key, value] of Object.entries(messages)) {
    messages[key] = value.replace(/{{\s*(\w+)\s*}}/g, "{$1}");
  }
};
