import { TooltipProvider } from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";
import { useState } from "react";
import { useCallback } from "react";

import type { API_VERSIONS_ENUM } from "@calcom/platform-constants";
import { IconSprites } from "@calcom/ui/components/icon";
import deTranslations from "@calcom/web/public/static/locales/de/common.json";
import enTranslations from "@calcom/web/public/static/locales/en/common.json";
import esTranslations from "@calcom/web/public/static/locales/es/common.json";
import frTranslations from "@calcom/web/public/static/locales/fr/common.json";
import itTranslations from "@calcom/web/public/static/locales/it/common.json";
import nlTranslations from "@calcom/web/public/static/locales/nl/common.json";
import ptBrTranslations from "@calcom/web/public/static/locales/pt-BR/common.json";

import { AtomsContext } from "../hooks/useAtomsContext";
import { useMe } from "../hooks/useMe";
import { useOAuthClient } from "../hooks/useOAuthClient";
import { useOAuthFlow } from "../hooks/useOAuthFlow";
import { useTimezone } from "../hooks/useTimezone";
import { useUpdateUserTimezone } from "../hooks/useUpdateUserTimezone";
import http from "../lib/http";
import { Toaster } from "../src/components/ui/toaster";
import type {
  translationKeys,
  CalProviderLanguagesType,
  enTranslationKeys,
  frTranslationKeys,
  ptBrTranslationKeys,
  deTranslationKeys,
  esTranslationKeys,
  itTranslationKeys,
  nlTranslationKeys,
  i18nProps,
} from "./languages";
import { EN } from "./languages";

export type BaseCalProviderProps = {
  children?: ReactNode;
  clientId: string;
  accessToken?: string;
  options: { refreshUrl?: string; apiUrl: string; readingDirection?: "ltr" | "rtl" };
  autoUpdateTimezone?: boolean;
  onTimezoneChange?: () => void;
  onTokenRefreshStart?: () => void;
  onTokenRefreshSuccess?: () => void;
  onTokenRefreshError?: (error: string) => void;
  version?: API_VERSIONS_ENUM;
  organizationId?: number;
  isEmbed?: boolean;
  isOAuth2?: boolean;
} & i18nProps;

export function BaseCalProvider({
  clientId,
  accessToken,
  options,
  children,
  labels,
  autoUpdateTimezone,
  language = EN,
  organizationId,
  onTimezoneChange,
  onTokenRefreshStart,
  onTokenRefreshSuccess,
  onTokenRefreshError,
  isEmbed,
  isOAuth2,
}: BaseCalProviderProps) {
  const [error, setError] = useState<string>("");
  const [stateOrgId, setOrganizationId] = useState<number>(0);

  const { data: me } = useMe(isEmbed);

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
    isEmbed,
    isOAuth2,
    clientId,
    apiUrl: options.apiUrl,
    refreshUrl: options.refreshUrl,
    onError: setError,
    onSuccess: (data) => {
      setError("");
      setOrganizationId(data.organizationId);
    },
  });

  const { isRefreshing, currentAccessToken } = useOAuthFlow({
    accessToken,
    refreshUrl: options.refreshUrl,
    onError: setError,
    onSuccess: () => {
      setError("");
    },
    onTokenRefreshStart,
    onTokenRefreshSuccess,
    onTokenRefreshError,
    clientId,
  });

  const resolveKey = useCallback(
    (key: string, values: Record<string, string | number | null | undefined>) => {
      if (values?.count === undefined || values?.count === null) {
        return key;
      }

      const { count } = values;

      const translation = labels?.[key as keyof typeof labels] ?? String(getTranslation(key, language) ?? "");

      // note(Lauris): if translation contains {{count}}, don't append pluralization suffix because count does not represent
      // the decision which key to use but it is to be interpolated as the value.
      if (translation.includes("{{count}}")) {
        return key;
      }

      const num = Number(count);
      const pluralForm = num === 1 ? "one" : "other";
      return `${key}_${pluralForm}`;
    },
    []
  );

  const translations = {
    t: (key: string, values: Record<string, string | number | null | undefined>) => {
      const resolvedKey = resolveKey(key, values);

      let translation =
        labels?.[resolvedKey as keyof typeof labels] ?? String(getTranslation(resolvedKey, language) ?? "");
      if (!translation) {
        return key;
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
        organizationId: organizationId || stateOrgId || me?.data.organizationId || 0,
        userId: me?.data.id,
        isEmbed,
        ...translations,
      }}>
      <TooltipProvider>{children}</TooltipProvider>
      <Toaster />
      <IconSprites />
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
        isEmbed: false,
      }}>
      <>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
        <IconSprites />
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
    case "it":
      return itTranslations[key as itTranslationKeys];
    case "nl":
      return nlTranslations[key as nlTranslationKeys];
    default:
      return enTranslations[key as enTranslationKeys];
  }
}
