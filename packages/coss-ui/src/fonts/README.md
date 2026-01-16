# Shared Fonts

This directory contains shared font files and configurations used across all apps in the monorepo.

## Usage

Import fonts directly from the shared UI package:

```tsx
import { fontSans, fontHeading } from "@coss/ui/fonts";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${fontSans.variable} ${fontHeading.variable}`}>
        {children}
      </body>
    </html>
  );
}
```

## Available Fonts

- `fontSans` - Inter font from Google Fonts (body text)
- `fontHeading` - Cal Sans SemiBold font (headings)

## Adding New Fonts

For local fonts, place the font file in this directory and add a configuration in `index.ts`:

```typescript
import localFont from "next/font/local";

export const yourNewFont = localFont({
  src: "./YourFont.woff2",
  variable: "--font-your-name",
  display: "swap",
});
```

Then use it in any app by importing from `@coss/ui/fonts`.

## Benefits of This Approach

- Single source of truth for fonts
- No fragile relative paths
- Type-safe imports
- Versioned with the UI package
- Easy to update across all apps
