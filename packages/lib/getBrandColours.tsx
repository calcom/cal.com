import { useBrandColors } from "@calcom/embed-core/embed-iframe";

const BRAND_COLOR = "#292929";
const DARK_BRAND_COLOR = "#fafafa";

type Rgb = {
  r: number;
  g: number;
  b: number;
};

function hexToRgb(hex: string): Rgb {
  const sanitizedHex = hex.replace("##", "#");
  const colorParts = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(sanitizedHex);

  if (!colorParts) {
    throw new Error("Invalid Hex colour");
  }

  const [, r, g, b] = colorParts;

  return {
    r: parseInt(r, 16),
    g: parseInt(g, 16),
    b: parseInt(b, 16),
  } as Rgb;
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => `0${c.toString(16)}`.slice(-2);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function lighten(hex: string, intensity: number): string {
  const color = hexToRgb(`#${hex}`);

  if (!color) {
    return "";
  }

  const r = Math.round(color.r + (255 - color.r) * intensity);
  const g = Math.round(color.g + (255 - color.g) * intensity);
  const b = Math.round(color.b + (255 - color.b) * intensity);

  return rgbToHex(r, g, b);
}

function darken(hex: string, intensity: number): string {
  const color = hexToRgb(hex);

  if (!color) {
    return "";
  }

  const r = Math.round(color.r * intensity);
  const g = Math.round(color.g * intensity);
  const b = Math.round(color.b * intensity);

  return rgbToHex(r, g, b);
}

function normalizeHexCode(hex: string | null, dark: boolean) {
  if (!hex) {
    return !dark ? BRAND_COLOR : DARK_BRAND_COLOR;
  }

  hex = hex.replace("#", "");

  // If the length of the hex code is 3, double up each character
  // e.g. fff => ffffff or a0e => aa00ee
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map(function (hex) {
        return hex + hex;
      })
      .join("");
  }

  return hex;
}

const createColorMap = (brandColor: string) => {
  const response: Record<string, string> = {
    500: `#${brandColor}`.replace("##", "#"),
  };
  const intensityMap: {
    [key: number]: number;
  } = {
    50: 0.95,
    100: 0.9,
    200: 0.75,
    300: 0.6,
    400: 0.3,
    600: 0.9,
    700: 0.75,
    800: 0.6,
    900: 0.49,
  };

  [50, 100, 200, 300, 400].forEach((level) => {
    response[level] = lighten(brandColor, intensityMap[level]);
  });

  [600, 700, 800, 900].forEach((level) => {
    response[level] = darken(brandColor, intensityMap[level]);
  });
  return response;
};

function getContrastColor(hexBackground: string): string {
  // Convert hex color to RGB values
  const color = hexToRgb(hexBackground);
  // Calculate relative luminance using a standard formula
  const relativeLuminance = (0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b) / 255;

  // Calculate contrast ratio with white and black
  const whiteContrast = (relativeLuminance + 0.05) / 1.05;
  const blackContrast = 1.05 / (relativeLuminance + 0.05);

  // Choose color with highest contrast ratio
  const whiteHex = "#FFFFFF";
  const blackHex = "#000000";
  const textColor = whiteContrast > blackContrast ? whiteHex : blackHex;

  return textColor;
}

/**
 * Given a light and dark brand color value, update the css variables
 * within the document to reflect the new brand colors.
 */
const useGetBrandingColours = ({
  lightVal = BRAND_COLOR,
  darkVal = DARK_BRAND_COLOR,
}: {
  lightVal: string | undefined | null;
  darkVal: string | undefined | null;
}) => {
  const embedBrandingColors = useBrandColors();

  lightVal = embedBrandingColors.brandColor || lightVal;

  // convert to 6 digit equivalent if 3 digit code is entered
  lightVal = normalizeHexCode(lightVal, false);

  darkVal = normalizeHexCode(darkVal, true);

  const lightColourMap = createColorMap(lightVal);
  const darkColourMap = createColorMap(darkVal);

  return {
    light: {
      "cal-brand": lightColourMap["500"],
      "cal-brand-emphasis": lightColourMap["400"],
      "cal-brand-subtle": lightColourMap["200"],
      "cal-brand-text": lightColourMap["200"],
    },
    dark: {
      "cal-brand": darkColourMap["500"],
      "cal-brand-emphasis": darkColourMap["600"],
      "cal-brand-subtle": darkColourMap["800"],
      "cal-brand-text": darkColourMap["200"],
    },
    // @hariom - are these needed still? Can we move these to tokens?
    root: {
      "booking-highlight-color": embedBrandingColors.highlightColor || "#10B981",
      "booking-lightest-color": embedBrandingColors.lightestColor || "#E1E1E1",
      "booking-lighter-color": embedBrandingColors.lighterColor || "#ACACAC",
      "booking-light-color": embedBrandingColors.lightColor || "#888888",
      "booking-median-color": embedBrandingColors.medianColor || "#494949",
      "booking-dark-color": embedBrandingColors.darkColor || "#313131",
      "booking-darker-color": embedBrandingColors.darkerColor || "#292929",
    },
  };
};

export default useGetBrandingColours;
