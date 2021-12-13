import { useEffect } from "react";

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

function getContrastingTextColor(bgColor: string | null): string {
  bgColor = bgColor == "" || bgColor == null ? "#292929" : bgColor;
  const rgb = hexToRGB(bgColor);
  const whiteContrastRatio = computeContrastRatio(rgb, [255, 255, 255]);
  const blackContrastRatio = computeContrastRatio(rgb, [41, 41, 41]); //#292929
  return whiteContrastRatio > blackContrastRatio ? "#ffffff" : "#292929";
}

const BrandColor = ({ val = "#292929" }: { val: string | undefined | null }) => {
  useEffect(() => {
    document.documentElement.style.setProperty("--brand-color", val);
    document.documentElement.style.setProperty("--brand-text-color", getContrastingTextColor(val));
  }, [val]);
  return null;
};

export default BrandColor;
