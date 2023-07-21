"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useMeta } from "@calcom/ui";
import { ArrowLeft } from "@calcom/ui/components/icon";

export function SettingsHeader() {
  const { meta } = useMeta();
  const { t, isLocaleReady } = useLocale();
  return (
    <header className="mx-auto block justify-between pt-8 sm:flex">
      <div className="border-subtle mb-8 flex w-full items-center border-b pb-6">
        {meta.backButton && (
          <a href="javascript:history.back()">
            <ArrowLeft className="mr-7" />
          </a>
        )}
        <div>
          {meta.title && isLocaleReady ? (
            <h1 className="font-cal text-emphasis mb-1 text-xl font-bold leading-5 tracking-wide">
              {t(meta.title)}
            </h1>
          ) : (
            <div className="bg-emphasis mb-1 h-5 w-24 animate-pulse rounded-md" />
          )}
          {meta.description && isLocaleReady ? (
            <p className="text-default text-sm ltr:mr-4 rtl:ml-4">{t(meta.description)}</p>
          ) : (
            <div className="bg-emphasis h-5 w-32 animate-pulse rounded-md" />
          )}
        </div>
        <div className="ms-auto flex-shrink-0">{meta.CTA}</div>
      </div>
    </header>
  );
}
