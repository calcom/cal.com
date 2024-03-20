import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { BaseCalProvider } from "./BaseCalProvider";

const queryClient = new QueryClient();

export type CalProviderProps = {
  children?: ReactNode;
  clientId: string;
  accessToken: string;
  options: { refreshUrl?: string; apiUrl: string };
  autoUpdateTimezone?: boolean;
  onTimezoneChange?: () => void;
};

export function CalProvider({
  clientId,
  accessToken,
  options,
  children,
  autoUpdateTimezone = true,
  onTimezoneChange,
}: CalProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <BaseCalProvider
        autoUpdateTimezone={autoUpdateTimezone}
        onTimezoneChange={onTimezoneChange}
        clientId={clientId}
        accessToken={accessToken}
        options={options}>
        {children}
      </BaseCalProvider>
    </QueryClientProvider>
  );
}
