// .storybook/YourTheme.js
import { create } from "@storybook/theming";

export default create({
  base: "light",
  brandTitle: "Track Abilities",
  brandUrl: "https://www.trackabilities.be",
  brandImage: "/logo.svg",

  colorPrimary: "hotpink",
  colorSecondary: "deepskyblue",

  // UI
  appBg: "white",
  appContentBg: "#EBF5F6",
  appBorderColor: "#EBF5F6",
  appBorderRadius: 8,

  // Typography
  fontBase: '"Open Sans", sans-serif',
  fontCode: "monospace",

  lightest: "red",

  // Text colors
  textColor: "#40a0a9",
  textInverseColor: "rgba(255,255,255,0.9)",

  // Toolbar default and active colors
  barTextColor: "#B2D9DC",
  barSelectedColor: "#EBF5F6",
  barBg: "#40a0a9",

  // Form colors
  inputBg: "white",
  inputBorder: "silver",
  inputTextColor: "black",
  inputBorderRadius: 4,
});
