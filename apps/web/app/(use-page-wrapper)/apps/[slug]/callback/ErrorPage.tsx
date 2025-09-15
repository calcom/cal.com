"use client";

import Link from "next/link";

import { useLocale } from "@calcom/lib/hooks/useLocale";

export default function ErrorPage({ error }: { error?: string }) {
  const { t } = useLocale();
  return (
    <div
      className="bg-default flex min-h-screen flex-col items-center justify-center px-4"
      data-testid="booking-payment-cb">
      <p className="text-emphasis text-sm font-semibold uppercase tracking-wide">{t("error_404")}</p>

      <h1 className="font-cal text-emphasis mt-2 text-4xl font-extrabold sm:text-5xl">
        {error || "App oauth redirection failed"}
      </h1>

      <Link
        href="/"
        className="text-emphasis hover:text-emphasis-dark mt-4 text-lg underline"
        data-testid="home-link">
        {t("go_back_home")}
      </Link>
    </div>
  );
}

