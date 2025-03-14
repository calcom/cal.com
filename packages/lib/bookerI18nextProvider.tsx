"use client";

import type { Resource } from "i18next";
import i18n from "i18next";
import React, { createContext, useContext, useEffect, useState } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";

import { useViewerI18n } from "@calcom/web/components/I18nLanguageHandler";

type BookerI18nContextType = {
  i18n: typeof i18n;
  t: typeof i18n.t;
  isLocaleReady: boolean;
};

const BookerI18nContext = createContext<BookerI18nContextType | null>(null);

export const BookerI18nextProvider = ({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: string;
}) => {
  const { data } = useViewerI18n(locale);
  const [contextValue, setContextValue] = useState<BookerI18nContextType | null>(null);

  useEffect(() => {
    const initializeI18n = async () => {
      if (data?.i18n?._nextI18Next?.initialI18nStore) {
        const i18nInstance = i18n.createInstance();
        await i18nInstance.use(initReactI18next).init({
          resources: data.i18n._nextI18Next.initialI18nStore as Resource,
          lng: locale,
          fallbackLng: "en",
          ns: ["common"],
        });
        setContextValue({
          i18n: i18nInstance,
          t: i18nInstance.t,
          isLocaleReady: true,
        });
      }
    };

    initializeI18n();
  }, [data, locale]);

  if (!contextValue || !contextValue.isLocaleReady) {
    return null;
  }

  return (
    <BookerI18nContext.Provider value={contextValue}>
      <I18nextProvider i18n={contextValue.i18n}>{children}</I18nextProvider>
    </BookerI18nContext.Provider>
  );
};

export const useBookerI18n = (): BookerI18nContextType | null => {
  return useContext(BookerI18nContext);
};
