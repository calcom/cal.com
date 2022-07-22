import { useState } from "react";

import ColorPicker from "@calcom/ui/v2/colorpicker";

// eslint-disable-next-line import/no-anonymous-default-export
export default {
  title: "Colors",
  component: ColorPicker,
};
const COLORS = {
  brand: {
    50: "#f3f3f4",
    100: "#e7e8e9",
    200: "#c4c5c9",
    300: "#a0a3a9",
    400: "#585d68",
    500: "#111827", // Brand color
    600: "#0f1623",
    700: "#0d121d",
    800: "#0a0e17",
    900: "#080c13",
  },
  gray: {
    50: "#F8F8F8",
    100: "#F5F5F5",
    200: "#E1E1E1",
    300: "#CFCFCF",
    400: "#ACACAC",
    500: "#888888",
    600: "#494949",
    700: "#3E3E3E",
    800: "#313131",
    900: "#292929",
  },
  neutral: {
    50: "#F8F8F8",
    100: "#F5F5F5",
    200: "#E1E1E1",
    300: "#CFCFCF",
    400: "#ACACAC",
    500: "#888888",
    600: "#494949",
    700: "#3E3E3E",
    800: "#313131",
    900: "#292929",
  },
  primary: {
    50: "#F4F4F4",
    100: "#E8E8E8",
    200: "#C6C6C6",
    300: "#A3A3A3",
    400: "#5F5F5F",
    500: "#1A1A1A",
    600: "#171717",
    700: "#141414",
    800: "#101010",
    900: "#0D0D0D",
  },
  secondary: {
    50: "#F5F8F7",
    100: "#EBF0F0",
    200: "#CDDAD9",
    300: "#AEC4C2",
    400: "#729894",
    500: "#356C66",
    600: "#30615C",
    700: "#28514D",
    800: "#20413D",
    900: "#223B41",
  },
  red: {
    50: "#FEF2F2",
    100: "#FEE2E2",
    200: "#FECACA",
    300: "#FCA5A5",
    400: "#F87171",
    500: "#EF4444",
    600: "#DC2626",
    700: "#B91C1C",
    800: "#991B1B",
    900: "#7F1D1D",
  },
  orange: {
    50: "#FFF7ED",
    100: "#FFEDD5",
    200: "#FED7AA",
    300: "#FDBA74",
    400: "#FB923C",
    500: "#F97316",
    600: "#EA580C",
    700: "#C2410C",
    800: "#9A3412",
    900: "#7C2D12",
  },
  green: {
    50: "#ECFDF5",
    100: "#D1FAE5",
    200: "#A7F3D0",
    300: "#6EE7B7",
    400: "#34D399",
    500: "#10B981",
    600: "#059669",
    700: "#047857",
    800: "#065F46",
    900: "#064E3B",
  },
};
export const All = () => {
  return (
    <div className="w-full">
      <div>
        {Object.keys(COLORS.brand).map((color) => (
          <div className="flex flex-row space-x-2" key={COLORS.brand[color]}>
            <div className="w-full">Brand</div>
            <div className="w-full">{color}</div>
            <div className="w-full">{COLORS.brand[color]}</div>
            <div
              style={{
                backgroundColor: COLORS.brand[color],
                width: "100%",
                height: "32px",
              }}
            />
          </div>
        ))}
        <hr />
        {Object.keys(COLORS.gray).map((color) => (
          <div className="flex flex-row space-x-2" key={COLORS.gray[color]}>
            <div className="w-full">gray</div>
            <div className="w-full">{color}</div>
            <div className="w-full">{COLORS.gray[color]}</div>
            <div
              style={{
                backgroundColor: COLORS.gray[color],
                width: "100%",
                height: "32px",
              }}
            />
          </div>
        ))}
        <hr />
        {Object.keys(COLORS.secondary).map((color) => (
          <div className="flex flex-row space-x-2" key={COLORS.secondary[color]}>
            <div className="w-full">secondary</div>
            <div className="w-full">{color}</div>
            <div className="w-full">{COLORS.secondary[color]}</div>
            <div
              style={{
                backgroundColor: COLORS.secondary[color],
                width: "100%",
                height: "32px",
              }}
            />
          </div>
        ))}
        <hr />
        {Object.keys(COLORS.red).map((color) => (
          <div className="flex flex-row space-x-2" key={COLORS.red[color]}>
            <div className="w-full">red</div>
            <div className="w-full">{color}</div>
            <div className="w-full">{COLORS.red[color]}</div>
            <div
              style={{
                backgroundColor: COLORS.red[color],
                width: "100%",
                height: "32px",
              }}
            />
          </div>
        ))}
        <hr />
        {Object.keys(COLORS.orange).map((color) => (
          <div className="flex flex-row space-x-2" key={COLORS.orange[color]}>
            <div className="w-full">orange</div>
            <div className="w-full">{color}</div>
            <div className="w-full">{COLORS.orange[color]}</div>
            <div
              style={{
                backgroundColor: COLORS.orange[color],
                width: "100%",
                height: "32px",
              }}
            />
          </div>
        ))}
        <hr />
        {Object.keys(COLORS.green).map((color) => (
          <div className="flex flex-row space-x-2" key={COLORS.green[color]}>
            <div className="w-full">green</div>
            <div className="w-full">{color}</div>
            <div className="w-full">{COLORS.green[color]}</div>
            <div
              style={{
                backgroundColor: COLORS.green[color],
                width: "100%",
                height: "32px",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
export const ColorPickerComponent = () => {
  const [color, setColor] = useState("3B82F6");
  return <ColorPicker defaultValue={color} onChange={(val) => setColor(val)} />;
};
