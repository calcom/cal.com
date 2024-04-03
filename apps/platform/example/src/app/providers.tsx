"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes/dist/types";
import { TRPCReactProvider } from "~/trpc/react";

// Add any providers (e.g. TooltipsProvider) here
export function Providers({ children, ...props }: ThemeProviderProps) {
  return (
    <TRPCReactProvider>
      <NextThemesProvider {...props}>{children}</NextThemesProvider>
    </TRPCReactProvider>
  );
}
