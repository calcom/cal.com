import Head from "next/head";

import { useBrandColors } from "@calcom/embed-core/embed-iframe";

const brandColor = "#292929";
const brandTextColor = "#ffffff";
const darkBrandColor = "#fafafa";

export function colorNameToHex(color: string) {
  const colors = {
    aliceblue: "#f0f8ff",
    antiquewhite: "#faebd7",
    aqua: "#00ffff",
    aquamarine: "#7fffd4",
    azure: "#f0ffff",
    beige: "#f5f5dc",
    bisque: "#ffe4c4",
    black: "#000000",
    blanchedalmond: "#ffebcd",
    blue: "#0000ff",
    blueviolet: "#8a2be2",
    brown: "#a52a2a",
    burlywood: "#deb887",
    cadetblue: "#5f9ea0",
    chartreuse: "#7fff00",
    chocolate: "#d2691e",
    coral: "#ff7f50",
    cornflowerblue: "#6495ed",
    cornsilk: "#fff8dc",
    crimson: "#dc143c",
    cyan: "#00ffff",
    darkblue: "#00008b",
    darkcyan: "#008b8b",
    darkgoldenrod: "#b8860b",
    darkgray: "#a9a9a9",
    darkgreen: "#006400",
    darkkhaki: "#bdb76b",
    darkmagenta: "#8b008b",
    darkolivegreen: "#556b2f",
    darkorange: "#ff8c00",
    darkorchid: "#9932cc",
    darkred: "#8b0000",
    darksalmon: "#e9967a",
    darkseagreen: "#8fbc8f",
    darkslateblue: "#483d8b",
    darkslategray: "#2f4f4f",
    darkturquoise: "#00ced1",
    darkviolet: "#9400d3",
    deeppink: "#ff1493",
    deepskyblue: "#00bfff",
    dimgray: "#696969",
    dodgerblue: "#1e90ff",
    firebrick: "#b22222",
    floralwhite: "#fffaf0",
    forestgreen: "#228b22",
    fuchsia: "#ff00ff",
    gainsboro: "#dcdcdc",
    ghostwhite: "#f8f8ff",
    gold: "#ffd700",
    goldenrod: "#daa520",
    gray: "#808080",
    green: "#008000",
    greenyellow: "#adff2f",
    honeydew: "#f0fff0",
    hotpink: "#ff69b4",
    "indianred ": "#cd5c5c",
    indigo: "#4b0082",
    ivory: "#fffff0",
    khaki: "#f0e68c",
    lavender: "#e6e6fa",
    lavenderblush: "#fff0f5",
    lawngreen: "#7cfc00",
    lemonchiffon: "#fffacd",
    lightblue: "#add8e6",
    lightcoral: "#f08080",
    lightcyan: "#e0ffff",
    lightgoldenrodyellow: "#fafad2",
    lightgrey: "#d3d3d3",
    lightgreen: "#90ee90",
    lightpink: "#ffb6c1",
    lightsalmon: "#ffa07a",
    lightseagreen: "#20b2aa",
    lightskyblue: "#87cefa",
    lightslategray: "#778899",
    lightsteelblue: "#b0c4de",
    lightyellow: "#ffffe0",
    lime: "#00ff00",
    limegreen: "#32cd32",
    linen: "#faf0e6",
    magenta: "#ff00ff",
    maroon: "#800000",
    mediumaquamarine: "#66cdaa",
    mediumblue: "#0000cd",
    mediumorchid: "#ba55d3",
    mediumpurple: "#9370d8",
    mediumseagreen: "#3cb371",
    mediumslateblue: "#7b68ee",
    mediumspringgreen: "#00fa9a",
    mediumturquoise: "#48d1cc",
    mediumvioletred: "#c71585",
    midnightblue: "#191970",
    mintcream: "#f5fffa",
    mistyrose: "#ffe4e1",
    moccasin: "#ffe4b5",
    navajowhite: "#ffdead",
    navy: "#000080",
    oldlace: "#fdf5e6",
    olive: "#808000",
    olivedrab: "#6b8e23",
    orange: "#ffa500",
    orangered: "#ff4500",
    orchid: "#da70d6",
    palegoldenrod: "#eee8aa",
    palegreen: "#98fb98",
    paleturquoise: "#afeeee",
    palevioletred: "#d87093",
    papayawhip: "#ffefd5",
    peachpuff: "#ffdab9",
    peru: "#cd853f",
    pink: "#ffc0cb",
    plum: "#dda0dd",
    powderblue: "#b0e0e6",
    purple: "#800080",
    rebeccapurple: "#663399",
    red: "#ff0000",
    rosybrown: "#bc8f8f",
    royalblue: "#4169e1",
    saddlebrown: "#8b4513",
    salmon: "#fa8072",
    sandybrown: "#f4a460",
    seagreen: "#2e8b57",
    seashell: "#fff5ee",
    sienna: "#a0522d",
    silver: "#c0c0c0",
    skyblue: "#87ceeb",
    slateblue: "#6a5acd",
    slategray: "#708090",
    snow: "#fffafa",
    springgreen: "#00ff7f",
    steelblue: "#4682b4",
    tan: "#d2b48c",
    teal: "#008080",
    thistle: "#d8bfd8",
    tomato: "#ff6347",
    turquoise: "#40e0d0",
    violet: "#ee82ee",
    wheat: "#f5deb3",
    white: "#ffffff",
    whitesmoke: "#f5f5f5",
    yellow: "#ffff00",
    yellowgreen: "#9acd32",
  };

  return colors[color.toLowerCase() as keyof typeof colors] !== undefined
    ? colors[color.toLowerCase() as keyof typeof colors]
    : false;
}

function computeContrastRatio(a: number[], b: number[]) {
  const lum1 = computeLuminance(a[0], a[1], a[2]);
  const lum2 = computeLuminance(b[0], b[1], b[2]);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

function computeLuminance(r: number, g: number, b: number) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function hexToRGB(hex: string) {
  const color = hex.replace("#", "");
  return [parseInt(color.slice(0, 2), 16), parseInt(color.slice(2, 4), 16), parseInt(color.slice(4, 6), 16)];
}

function normalizeHexCode(hex: string | null, dark: boolean) {
  if (!hex) {
    return !dark ? brandColor : darkBrandColor;
  }
  hex = hex.replace("#", "");
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

function getContrastingTextColor(bgColor: string | null, dark: boolean): string {
  bgColor = bgColor == "" || bgColor == null ? (dark ? darkBrandColor : brandColor) : bgColor;
  const rgb = hexToRGB(bgColor);
  const whiteContrastRatio = computeContrastRatio(rgb, [255, 255, 255]);
  const blackContrastRatio = computeContrastRatio(rgb, [41, 41, 41]); //#292929
  return whiteContrastRatio > blackContrastRatio ? brandTextColor : brandColor;
}

export function isValidHexCode(val: string | null) {
  if (val) {
    val = val.indexOf("#") === 0 ? val : "#" + val;
    const regex = new RegExp("^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$");
    return regex.test(val);
  }
  return false;
}

export function fallBackHex(val: string | null, dark: boolean): string {
  if (val) if (colorNameToHex(val)) return colorNameToHex(val) as string;
  return dark ? darkBrandColor : brandColor;
}

const BrandColor = ({
  lightVal = brandColor,
  darkVal = darkBrandColor,
}: {
  lightVal: string | undefined | null;
  darkVal: string | undefined | null;
}) => {
  const embedBrandingColors = useBrandColors();
  lightVal = embedBrandingColors.brandColor || lightVal;
  // convert to 6 digit equivalent if 3 digit code is entered
  lightVal = normalizeHexCode(lightVal, false);
  darkVal = normalizeHexCode(darkVal, true);
  // ensure acceptable hex-code
  lightVal = isValidHexCode(lightVal)
    ? lightVal?.indexOf("#") === 0
      ? lightVal
      : "#" + lightVal
    : fallBackHex(lightVal, false);
  darkVal = isValidHexCode(darkVal)
    ? darkVal?.indexOf("#") === 0
      ? darkVal
      : "#" + darkVal
    : fallBackHex(darkVal, true);
  return (
    <Head>
      <style>
        {`body {
      /* green--500*/
      --booking-highlight-color: ${embedBrandingColors.highlightColor || "#10B981"};
      /*  gray--200 */
      --booking-lightest-color: ${embedBrandingColors.lightestColor || "#E1E1E1"};
      /* gray--400 */
      --booking-lighter-color: ${embedBrandingColors.lighterColor || "#ACACAC"};
      /* gray--500 */
      --booking-light-color: ${embedBrandingColors.lightColor || "#888888"};
      /* gray--600 */
      --booking-median-color: ${embedBrandingColors.medianColor || "#494949"};
      /* gray--800 */
      --booking-dark-color: ${embedBrandingColors.darkColor || "#313131"};
      /* gray--900 */
      --booking-darker-color: ${embedBrandingColors.darkerColor || "#292929"};
      --brand-color: ${lightVal};
      --brand-text-color: ${getContrastingTextColor(lightVal, true)};
      --brand-color-dark-mode: ${darkVal};
      --brand-text-color-dark-mode: ${getContrastingTextColor(darkVal, true)};
    `}
      </style>
    </Head>
  );
};

export default BrandColor;
