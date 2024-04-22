import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { BaseCalProvider } from "./BaseCalProvider";

const queryClient = new QueryClient();

export type CalProviderProps = {
  children?: ReactNode;
  clientId: string;
  accessToken?: string;
  options: { refreshUrl?: string; apiUrl: string };
  autoUpdateTimezone?: boolean;
  onTimezoneChange?: () => void;
};

/**
 * Renders a CalProvider component.
 *
 * @component
 * @param {string} props.clientId - The platform oauth client ID.
 * @param {string} props.accessToken - The access token of your managed user. - Optional
 * @param {object} props.options - The options object.
 * @param {string} [options.apiUrl] - The API URL. https://api.cal.com/v2
 * @param {string} [options.refreshUrl] - The url point to your refresh endpoint. - Optional, required if accessToken is provided.
 * @param {boolean} [autoUpdateTimezone=true] - Whether to automatically update the timezone. - Optional
 * @param {function} props.onTimezoneChange - The callback function for timezone change. - Optional
 * @param {ReactNode} props.children - The child components. - Optional
 * @returns {JSX.Element} The rendered CalProvider component.
 */
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
