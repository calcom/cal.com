"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes/dist/types";
import { TRPCReactProvider } from "~/trpc/react";
import { TooltipProvider } from "@radix-ui/react-tooltip";

// Add any providers (e.g. TooltipsProvider) here
export function Providers({ children, ...props }: ThemeProviderProps) {
  return (
    <TRPCReactProvider>
      <NextThemesProvider {...props}>
        <TooltipProvider>{children}</TooltipProvider></NextThemesProvider>
    </TRPCReactProvider>
  );
}
