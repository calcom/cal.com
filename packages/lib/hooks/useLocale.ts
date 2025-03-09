import { useTranslation } from "next-i18next";

import { useAtomsContext } from "@calcom/atoms/monorepo";
import { useBookingLanguage } from "@calcom/features/bookings/Booker";

export const useLocale = (namespace: Parameters<typeof useTranslation>[0] = "common") => {
  const context = useAtomsContext();
  const { i18n, t } = useTranslation(namespace);
  const isLocaleReady = Object.keys(i18n).length > 0;

  const bookingContext = useBookingLanguage();
  if (bookingContext?.isLocaleReady) {
    return {
      i18n: bookingContext.i18n,
      t: bookingContext.t,
      isLocaleReady: true,
    };
  }

  if (context?.clientId) {
    return { i18n: context.i18n, t: context.t, isLocaleReady: true } as unknown as {
      i18n: ReturnType<typeof useTranslation>["i18n"];
      t: ReturnType<typeof useTranslation>["t"];
      isLocaleReady: boolean;
    };
  }
  return {
    i18n,
    t,
    isLocaleReady,
  };
};
