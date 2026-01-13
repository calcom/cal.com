"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";

interface AppearanceUpgradePromptProps {
  onUpgradeClick?: () => void;
}

export function AppearanceUpgradePrompt({ onUpgradeClick }: AppearanceUpgradePromptProps) {
  const { t } = useLocale();

  return (
    <div className="border-subtle bg-muted relative overflow-hidden rounded-lg border p-6">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-orange-400/20 to-pink-400/20 blur-2xl" />
      <div className="relative">
        <div className="mb-4 flex items-center gap-2">
          <div className="bg-emphasis flex h-10 w-10 items-center justify-center rounded-lg">
            <Icon name="paintbrush" className="text-emphasis h-5 w-5" />
          </div>
          <div>
            <h3 className="text-emphasis text-base font-semibold">{t("booking_page_customization")}</h3>
            <p className="text-subtle text-sm">{t("organization_feature")}</p>
          </div>
        </div>

        <p className="text-default mb-4 text-sm">
          {t("booking_page_customization_description")}
        </p>

        <ul className="text-subtle mb-6 space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <Icon name="check" className="text-success h-4 w-4" />
            {t("custom_fonts_and_typography")}
          </li>
          <li className="flex items-center gap-2">
            <Icon name="check" className="text-success h-4 w-4" />
            {t("custom_colors_and_branding")}
          </li>
          <li className="flex items-center gap-2">
            <Icon name="check" className="text-success h-4 w-4" />
            {t("custom_border_radius_and_styling")}
          </li>
          <li className="flex items-center gap-2">
            <Icon name="check" className="text-success h-4 w-4" />
            {t("live_preview_editor")}
          </li>
        </ul>

        <Button color="primary" onClick={onUpgradeClick}>
          {t("upgrade_to_organization")}
        </Button>
      </div>
    </div>
  );
}
