"use client";

import { VERSION_2024_06_14 } from "@calcom/platform-constants";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useEffect } from "react";
import http from "../lib/http";
import type { BaseCalProviderProps } from "./BaseCalProvider";
import { BaseCalProvider } from "./BaseCalProvider";
import type { translationKeys } from "./languages";

function isRetryableError(error: unknown): boolean {
  if (!isAxiosError(error) || !error.response) {
    // network errors or timeouts — retryable
    return true;
  }
  const status = error.response.status;
  // retry on 408 (timeout), 429 (rate limit), and 5xx (server errors)
  return status === 408 || status === 429 || status >= 500;
}

const queryClient: QueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount: number, error: unknown): boolean => {
        if (!isRetryableError(error)) return false;
        return failureCount < 3;
      },
      retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 30000),
    },
    mutations: {
      retry: (failureCount: number, error: unknown): boolean => {
        if (!isRetryableError(error)) return false;
        return failureCount < 1;
      },
      retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 30000),
    },
  },
});

type CalProviderProps = Omit<BaseCalProviderProps, "isOAuth2">;

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
 * @param {function} props.onTokenRefreshStart - The callback function called when token refresh starts. - Optional
 * @param {function} props.onTokenRefreshSuccess - The callback function called when token refresh succeeds. - Optional
 * @param {function} props.onTokenRefreshError - The callback function called when token refresh fails. - Optional
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
  onTokenRefreshStart,
  onTokenRefreshSuccess,
  onTokenRefreshError,
  version = VERSION_2024_06_14,
  organizationId,
  isEmbed = false,
}: CalProviderProps): JSX.Element {
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
        isOAuth2={false}
        autoUpdateTimezone={autoUpdateTimezone}
        onTimezoneChange={onTimezoneChange}
        onTokenRefreshStart={onTokenRefreshStart}
        onTokenRefreshSuccess={onTokenRefreshSuccess}
        onTokenRefreshError={onTokenRefreshError}
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
