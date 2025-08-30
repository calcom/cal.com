import { createPreset } from "fumadocs-ui/tailwind-plugin";

import base from "@calcom/config/tailwind-preset";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    ...base.content,
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./content/**/*.{md,mdx}",
    "./mdx-components.{ts,tsx}",
    "./node_modules/fumadocs-ui/dist/**/*.js",
    "../../internal/ui/src/**/*.tsx",
    "../../internal/icons/src/**/*.tsx",
    "../../packages/ui/components/**/*.{ts,tsx}",
  ],
  plugins: [...base.plugins],
  theme: base.theme,
  presets: [createPreset()],
};
