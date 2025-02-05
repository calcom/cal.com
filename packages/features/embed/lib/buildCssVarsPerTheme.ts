function _buildCssVarsPerTheme({
  light,
  dark,
}: {
  light: { "cal-brand": string | null };
  dark: { "cal-brand": string | null };
}) {
  // Setting this value should remove it from the API
  const VALUE_WHEN_WE_DONT_WANT_IT_IN_API = undefined;
  const cssVarsPerTheme = Object.entries({ light, dark }).reduce((acc, [theme, themeCssVars]) => {
    if (!Object.values(themeCssVars).some(Boolean)) return acc;

    const truthyValues = Object.fromEntries(
      Object.entries(themeCssVars).filter(([_, value]) => Boolean(value))
    );

    return {
      ...acc,
      [theme]: truthyValues,
    };
  }, {});

  if (Object.keys(cssVarsPerTheme).length === 0) return VALUE_WHEN_WE_DONT_WANT_IT_IN_API;

  return cssVarsPerTheme;
}

export function buildCssVarsPerTheme({
  brandColor,
  darkBrandColor,
}: {
  brandColor: string | null;
  darkBrandColor: string | null;
}) {
  return _buildCssVarsPerTheme({
    light: { "cal-brand": brandColor },
    dark: { "cal-brand": darkBrandColor },
  });
}
