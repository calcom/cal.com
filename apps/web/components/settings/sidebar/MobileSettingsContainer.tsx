"use client";

import { Menu, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui";

export const MobileSettingsContainer = (props: { onSideContainerOpen?: () => void }) => {
  const { t } = useLocale();
  const router = useRouter();

  return (
    <>
      <nav className="bg-muted border-muted sticky top-0 z-20 flex w-full items-center justify-between border-b py-2 sm:relative lg:hidden">
        <div className="flex items-center space-x-3 ">
          <Button StartIcon={Menu} color="minimal" variant="icon" onClick={props.onSideContainerOpen}>
            <span className="sr-only">{t("show_navigation")}</span>
          </Button>

          <button
            className="hover:bg-emphasis flex items-center space-x-2 rounded-md px-3 py-1 rtl:space-x-reverse"
            onClick={() => router.back()}>
            <ArrowLeft className="text-default h-4 w-4" />
            <p className="text-emphasis font-semibold">{t("settings")}</p>
          </button>
        </div>
      </nav>
    </>
  );
};
