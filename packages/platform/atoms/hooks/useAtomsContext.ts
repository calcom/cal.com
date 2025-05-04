"use client";

import { createContext, useContext } from "react";

import type { CalProviderLanguagesType, translationKeys } from "../cal-provider/languages";
import type http from "../lib/http";

export interface IAtomsContextOptions {
  refreshUrl?: string;
  apiUrl: string;
  readingDirection?: "ltr" | "rtl";
}

export interface IAtomsContext {
  clientId: string;
  accessToken?: string;
  options: IAtomsContextOptions;
  error?: string;
  getClient: () => typeof http | void;
  refreshToken?: string;
  isRefreshing?: boolean;
  isAuth: boolean;
  isValidClient: boolean;
  isInit: boolean;
  t: (key: string, values: Record<string, string | number | undefined | null>) => string;
  i18n: {
    language: CalProviderLanguagesType;
    defaultLocale: CalProviderLanguagesType;
    locales: CalProviderLanguagesType[];
    exists: (key: translationKeys | string) => boolean;
  };
  organizationId: number;
  userId?: number;
  isEmbed?: boolean;
}

export const AtomsContext = createContext({
  clientId: "",
  accessToken: "",
  organizationId: 0,
  options: { refreshUrl: "", apiUrl: "" },
  error: "",
  getClient: () => {
    return;
  },
  isEmbed: false,
} as IAtomsContext);

export const useAtomsContext = () => useContext(AtomsContext);
