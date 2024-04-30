"use client";
/**
 * [@calcom] Make sure to wrap your app with our `CalProvider` to enable the use of our hooks.
 * @link https://cal.com/docs/platform/quick-start#5.3-setup-root-of-your-app
 */
import { CalProvider } from "@calcom/atoms";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes/dist/types";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { env } from "~/env";
import { type CalAccount } from "@prisma/client";

export function Providers({
  children,
  ...props
}: ThemeProviderProps & { calUserToken?: CalAccount["accessToken"] }) {
  const accessToken = props?.calUserToken;
  return (
      <CalProvider
        clientId={env.NEXT_PUBLIC_CAL_OAUTH_CLIENT_ID}
        options={{
          apiUrl: env.NEXT_PUBLIC_CAL_API_URL,
          refreshUrl: env.NEXT_PUBLIC_REFRESH_URL,
        }}
        {...(accessToken && { accessToken })}
      >
        <NextThemesProvider {...props}>
          <TooltipProvider>{children}</TooltipProvider>
        </NextThemesProvider>
      </CalProvider>
  );
}
