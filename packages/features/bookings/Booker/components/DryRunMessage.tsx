import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui/components/icon";

export const DryRunMessage = ({ isEmbed }: { isEmbed?: boolean }) => {
  const { t } = useLocale();
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div
      onClick={() => setIsVisible(false)}
      className={`bg-default border-subtle fixed left-1/2 ${
        !isEmbed ? "top-4" : "top-0"
      } z-50 -translate-x-1/2 transform cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm shadow-md`}>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Icon name="info" className="h-5 w-5 text-orange-500" />
        </div>
        <div className="text-emphasis font-medium" data-testid="dry-run-msg">
          {t("dry_run_mode_active")}
        </div>
      </div>
    </div>
  );
};
