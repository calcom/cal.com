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

- `fontSans` - Cal Sans UI variable font (supports multiple weights and modes)
- `fontHeading` - Cal Sans Regular font

## Adding New Fonts

1. Place the font file in this directory (`packages/coss-ui/src/fonts/`)
2. Add a new font configuration in `index.ts`:

```typescript
export const yourNewFont = localFont({
  display: "swap",
  src: "./YourFont.woff2",
  variable: "--font-your-name",
});
```

3. Use it in any app by importing from `@coss/ui/fonts`

## Benefits of This Approach

- Single source of truth for fonts
- No fragile relative paths
- Type-safe imports
- Versioned with the UI package
- Easy to update across all apps
