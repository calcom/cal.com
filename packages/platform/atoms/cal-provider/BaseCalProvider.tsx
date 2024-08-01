import { TooltipProvider } from "@radix-ui/react-tooltip";
import { useState } from "react";
import { useCallback } from "react";

import deTranslations from "@calcom/web/public/static/locales/de/common.json";
import enTranslations from "@calcom/web/public/static/locales/en/common.json";
import esTranslations from "@calcom/web/public/static/locales/es/common.json";
import frTranslations from "@calcom/web/public/static/locales/fr/common.json";
import ptBrTranslations from "@calcom/web/public/static/locales/pt-BR/common.json";

import { AtomsContext } from "../hooks/useAtomsContext";
import { useMe } from "../hooks/useMe";
import { useOAuthClient } from "../hooks/useOAuthClient";
import { useOAuthFlow } from "../hooks/useOAuthFlow";
import { useTimezone } from "../hooks/useTimezone";
import { useUpdateUserTimezone } from "../hooks/useUpdateUserTimezone";
import http from "../lib/http";
import { Toaster } from "../src/components/ui/toaster";
import { EN } from "./CalProvider";
import type {
  CalProviderProps,
  CalProviderLanguagesType,
  translationKeys,
  enTranslationKeys,
  frTranslationKeys,
  ptBrTranslationKeys,
  deTranslationKeys,
  esTranslationKeys,
} from "./CalProvider";

export function BaseCalProvider({
  clientId,
  accessToken,
  options,
  children,
  labels,
  autoUpdateTimezone,
  language = EN,
  onTimezoneChange,
}: CalProviderProps) {
  const [error, setError] = useState<string>("");
  const { data: me } = useMe();

  const { mutateAsync } = useUpdateUserTimezone();

  const handleTimezoneChange = useCallback(
    async (currentTimezone: string) => {
      await mutateAsync({ timeZone: currentTimezone });
    },
    [mutateAsync]
  );

  const getTimezoneChangeHandler = useCallback(() => {
    if (onTimezoneChange) return onTimezoneChange;
    if (!onTimezoneChange && autoUpdateTimezone) return handleTimezoneChange;
    return undefined;
  }, [onTimezoneChange, autoUpdateTimezone, handleTimezoneChange]);

  useTimezone(getTimezoneChangeHandler());

  const { isInit } = useOAuthClient({
    clientId,
    apiUrl: options.apiUrl,
    refreshUrl: options.refreshUrl,
    onError: setError,
    onSuccess: () => {
      setError("");
    },
  });

  const { isRefreshing, currentAccessToken } = useOAuthFlow({
    accessToken,
    refreshUrl: options.refreshUrl,
    onError: setError,
    onSuccess: () => {
      setError("");
    },
    clientId,
  });

  const translations = {
    t: (key: string, values: Record<string, string | number | null | undefined>) => {
      let translation = labels?.[key as keyof typeof labels] ?? String(getTranslation(key, language) ?? "");
      if (!translation) {
        return "";
      }
      if (values) {
        const valueKeys = Object.keys(values) as (keyof typeof values)[];
        if (valueKeys.length) {
          valueKeys.forEach((valueKey) => {
            if (translation)
              translation = translation.replace(
                `{{${String(valueKey)}}}`,
                values[valueKey]?.toString() ?? `{{${String(valueKey)}}}`
              );
          });
        }
      }

      return replaceOccurrences(translation, enTranslations) ?? "";
    },
    i18n: {
      language: language,
      defaultLocale: language,
      locales: [language],
      exists: (key: translationKeys | string) => Boolean(enTranslations[key as translationKeys]),
    },
  };

  return isInit ? (
    <AtomsContext.Provider
      value={{
        clientId,
        accessToken: currentAccessToken,
        options,
        error,
        getClient: () => http,
        isRefreshing: isRefreshing,
        isInit: isInit,
        isValidClient: Boolean(!error && clientId && isInit),
        isAuth: Boolean(isInit && !error && clientId && currentAccessToken && http.getAuthorizationHeader()),
        organizationId: me?.data.organizationId || 0,
        ...translations,
      }}>
      <TooltipProvider>{children}</TooltipProvider>
      <Toaster />
    </AtomsContext.Provider>
  ) : (
    <AtomsContext.Provider
      value={{
        clientId,
        options,
        error,
        getClient: () => http,
        isAuth: false,
        isValidClient: Boolean(!error && clientId),
        isInit: false,
        isRefreshing: false,
        ...translations,
        organizationId: 0,
      }}>
      <>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </>
    </AtomsContext.Provider>
  );
}

function replaceOccurrences(input: string, replacementMap: { [key: string]: string }): string {
  const pattern = /\$t\((.*?)\)/g;
  return input.replace(pattern, (match, key) => {
    if (key in replacementMap) {
      return replacementMap[key];
    }
    // If the key is not found in the replacement map, you may choose to return the original match
    return match;
  });
}

function getTranslation(key: string, language: CalProviderLanguagesType) {
  switch (language) {
    case "en":
      return enTranslations[key as enTranslationKeys];
    case "fr":
      return frTranslations[key as frTranslationKeys];
    case "pt-BR":
      return ptBrTranslations[key as ptBrTranslationKeys];
    case "de":
      return deTranslations[key as deTranslationKeys];
    case "es":
      return esTranslations[key as esTranslationKeys];
    default:
      return enTranslations[key as enTranslationKeys];
  }
}
