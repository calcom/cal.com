"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";

import type { API_VERSIONS_ENUM } from "@calcom/platform-constants";
import { VERSION_2024_06_14 } from "@calcom/platform-constants";
import type ptBrTranslations from "@calcom/web/public/static/locales/pt-BR/common.json";

import http from "../lib/http";
import { BaseCalProvider } from "./BaseCalProvider";

export type ptBrTranslationKeys = keyof typeof ptBrTranslations;

export const PT_BR = "pt-BR";

export const CAL_PROVIDER_LANGUAUES = [PT_BR] as const;
export type CalProviderLanguagesType = (typeof CAL_PROVIDER_LANGUAUES)[number];

const queryClient = new QueryClient();

type i18nPtBrProps = {
  labels?: Partial<Record<ptBrTranslationKeys, string>>;
  language?: "pt-BR";
};

export type CalProviderProps = {
  children?: ReactNode;
  clientId: string;
  accessToken?: string;
  options: { refreshUrl?: string; apiUrl: string };
  autoUpdateTimezone?: boolean;
  onTimezoneChange?: () => void;
  version?: API_VERSIONS_ENUM;
} & i18nPtBrProps;

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
  language = PT_BR,
  onTimezoneChange,
  version = VERSION_2024_06_14,
}: CalProviderProps) {
  useEffect(() => {
    http.setVersionHeader(version);
  }, [version]);

  useEffect(() => {
    if (accessToken) {
      queryClient.resetQueries();
    }
  }, [accessToken]);

  return (
    <QueryClientProvider client={queryClient}>
      <BaseCalProvider
        autoUpdateTimezone={autoUpdateTimezone}
        onTimezoneChange={onTimezoneChange}
        clientId={clientId}
        accessToken={accessToken}
        options={options}
        version={version}
        labels={labels as Record<ptBrTranslationKeys, string>}
        language={language}>
        {children}
      </BaseCalProvider>
    </QueryClientProvider>
  );
}
