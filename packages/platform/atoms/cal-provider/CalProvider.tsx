import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";

import type { API_VERSIONS_ENUM } from "@calcom/platform-constants";
import { VERSION_2024_06_11 } from "@calcom/platform-constants";

import http from "../lib/http";
import { BaseCalProvider } from "./BaseCalProvider";

const queryClient = new QueryClient();

export type CalProviderProps = {
  children?: ReactNode;
  clientId: string;
  accessToken?: string;
  options: { refreshUrl?: string; apiUrl: string };
  autoUpdateTimezone?: boolean;
  onTimezoneChange?: () => void;
  version?: API_VERSIONS_ENUM;
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
  version = VERSION_2024_06_11,
}: CalProviderProps) {
  useEffect(() => {
    http.setVersionHeader(version);
  }, [version]);

  return (
    <QueryClientProvider client={queryClient}>
      <BaseCalProvider
        autoUpdateTimezone={autoUpdateTimezone}
        onTimezoneChange={onTimezoneChange}
        clientId={clientId}
        accessToken={accessToken}
        options={options}
        version={version}>
        {children}
      </BaseCalProvider>
    </QueryClientProvider>
  );
}
