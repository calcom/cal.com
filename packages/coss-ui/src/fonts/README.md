# Shared Fonts

This directory contains shared font configurations used across all apps in the monorepo.

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

- `fontSans` - Inter font from Google Fonts (body text, all weights)
- `fontHeading` - Inter font at weight 600/semibold (headings)

## Adding New Fonts

Add a new font configuration in `index.ts`:

```typescript
import { YourFont } from "next/font/google";

export const yourNewFont = YourFont({
  subsets: ["latin"],
  variable: "--font-your-name",
});
```

Then use it in any app by importing from `@coss/ui/fonts`.

## Benefits of This Approach

- Single source of truth for fonts
- No fragile relative paths
- Type-safe imports
- Versioned with the UI package
- Easy to update across all apps
