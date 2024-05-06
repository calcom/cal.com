export const defaultTheme: any = {
  heading: "py-1 font-medium text-lg text-primary-700 dark:text-white",
  item: "py-1 text-lg",
  itemActive: "font-medium text-primary-700 dark:text-white",
  itemInactive: "font-normal text-neutral-500 dark:text-white/50",
  lineActive: "",
  lineInactive: "",
};

export const getThemeItem = (
  item: string,
  fallbackItem: string,
  theme: any
): any => {
  if (theme) {
    if (item in theme) {
      return theme[item];
    } else if (fallbackItem in theme) {
      return theme[fallbackItem];
    }
  }
  if (item in defaultTheme) {
    return defaultTheme[item];
  } else {
    return defaultTheme[fallbackItem];
  }
};

export const getClassNameOrStyle = (
  item: string,
  fallbackItem: string,
  theme: any,
  className: string,
  style: any
) => {
  const themeItem = getThemeItem(item, fallbackItem, theme);
  return {
    className: `${className} ${themeItem}`,
    style,
  };
};
