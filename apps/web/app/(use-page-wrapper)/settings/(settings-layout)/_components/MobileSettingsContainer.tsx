"use client";

import { useRouter } from "next/navigation";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";

interface MobileSettingsContainerProps {
  onSideContainerOpen?: () => void;
}

export default function MobileSettingsContainer({ onSideContainerOpen }: MobileSettingsContainerProps) {
  const { t } = useLocale();
  const router = useRouter();

  return (
    <nav className="bg-muted border-muted sticky top-0 z-20 flex w-full items-center justify-between border-b px-2 py-2 sm:relative lg:hidden">
      <div className="flex items-center space-x-3">
        <Button StartIcon="menu" color="minimal" variant="icon" onClick={onSideContainerOpen}>
          <span className="sr-only">{t("show_navigation")}</span>
        </Button>

        <button
          className="hover:bg-emphasis flex items-center space-x-2 rounded-md px-3 py-1 rtl:space-x-reverse"
          onClick={() => router.back()}>
          <Icon name="arrow-left" className="text-default h-4 w-4" />
          <p className="text-emphasis font-semibold">{t("settings")}</p>
        </button>
      </div>
    </nav>
  );
}
