import type { Color, HSL, Shade } from "./interfaces";

// Yeah i stole this...
const hexToHSL = (hex: string): HSL => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex) || [];
  try {
    let r = parseInt(result[1], 16);
    let g = parseInt(result[2], 16);
    let b = parseInt(result[3], 16);
    (r /= 255), (g /= 255), (b /= 255);
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h = 0,
      s,
      // eslint-disable-next-line prefer-const
      l = (max + min) / 2;
    if (max == min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    const HSL: HSL = { h: 0, s: 0, l: 0 };
    HSL.h = Math.round(h * 360);
    HSL.s = Math.round(s * 100);
    HSL.l = Math.round(l * 100);
    return HSL;
  } catch (error) {
    console.log(hex);
    return { h: 0, s: 0, l: 0 };
  }
};

const hslToHex = ({ h, s, l }: HSL): string => {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0"); // convert to Hex and prefix "0" if needed
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const HSL_SHADES: Shade[] = [
  { name: "50", lightness: 98 },
  { name: "100", lightness: 95 },
  { name: "200", lightness: 90 },
  { name: "300", lightness: 82 },
  { name: "400", lightness: 64 },
  { name: "500", lightness: 46 },
  { name: "600", lightness: 33 },
  { name: "700", lightness: 24 },
  { name: "800", lightness: 14 },
  { name: "900", lightness: 7 },
];

const generateColor = ({ hex }: { hex: string }): Color => {
  const colorHSL = hexToHSL(hex);
  const obj: Color = {};
  HSL_SHADES.forEach(({ name, lightness }: Shade) => {
    const { h, s } = colorHSL;
    const hsl: HSL = { h, s, l: lightness };
    const hex = hslToHex(hsl);
    obj[name] = hex;
  });

  return obj;
};

export { generateColor };
