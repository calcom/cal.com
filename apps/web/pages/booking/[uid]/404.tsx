import Head from "next/head";

import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import PageWrapper from "@components/PageWrapper";

export default function BookingConfirmationError() {
  const { t } = useLocale();

  return (
    <div className="bg-subtle flex h-screen">
      <Head>
        <title>Booking not found | {APP_NAME}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="rtl: bg-default m-auto rounded-md p-10 text-right ltr:text-left">
        <h1 className="font-cal text-emphasis text-6xl">404</h1>
        <h2 className="text-emphasis mt-6 text-2xl font-medium">{t("booking_not_found")}</h2>
        <p className="text-default mb-6 mt-4 max-w-2xl text-sm">{t("booking_not_found_description")}</p>
      </div>
    </div>
  );
}

BookingConfirmationError.PageWrapper = PageWrapper;
