"use client";

import { VERSION_2024_06_14 } from "@calcom/platform-constants";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import http from "../lib/http";
import type { BaseCalProviderProps } from "./BaseCalProvider";
import { BaseCalProvider } from "./BaseCalProvider";
import type { translationKeys } from "./languages";

const queryClient = new QueryClient();

type CalOAuthProviderProps = Omit<BaseCalProviderProps, "isOAuth2">;

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
export function CalOAuthProvider({
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
}: CalOAuthProviderProps) {
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
        isOAuth2={true}
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
