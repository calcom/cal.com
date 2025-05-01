"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";

import { VERSION_2024_06_14 } from "@calcom/platform-constants";

import http from "../lib/http";
import type { CalProviderProps } from "./BaseCalProvider";
import { BaseCalProvider } from "./BaseCalProvider";
import type { translationKeys } from "./languages";

const queryClient = new QueryClient();

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
  labels,
  language = "en",
  onTimezoneChange,
  version = VERSION_2024_06_14,
  organizationId,
  isEmbed = false,
}: CalProviderProps) {
  useEffect(() => {
    http.setVersionHeader(version);
  }, [version]);

  useEffect(() => {
    if (accessToken) {
      queryClient.resetQueries();
    }
  }, [accessToken]);

  useEffect(() => {
    http.setPlatformEmbedHeader(isEmbed);
  }, [isEmbed]);

  return (
    <QueryClientProvider client={queryClient}>
      <BaseCalProvider
        isEmbed={isEmbed}
        autoUpdateTimezone={autoUpdateTimezone}
        onTimezoneChange={onTimezoneChange}
        clientId={clientId}
        accessToken={accessToken}
        options={options}
        version={version}
        labels={labels as Record<translationKeys, string>}
        language={language}
        organizationId={organizationId}>
        {children}
      </BaseCalProvider>
    </QueryClientProvider>
  );
}
