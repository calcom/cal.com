import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Label } from "@calcom/ui/components/form";

import { cn } from "../src/lib/utils";
import type { DestinationCalendarProps } from "./DestinationCalendarSelector";
import { DestinationCalendarSelector } from "./DestinationCalendarSelector";

export const DestinationCalendarSettings = (props: DestinationCalendarProps & { classNames?: string }) => {
  const { t } = useLocale();

  return (
    <div className={cn("border-subtle mb-6 mt-8 rounded-lg border", props?.classNames)}>
      <DestinationCalendarSettingsHeading />
      <div className="border-t">
        <div className="border-subtle flex w-full flex-col space-y-3 border-y-0 p-6">
          <div>
            <Label className="text-default mb-0 font-medium">{t("add_events_to")}</Label>
            <DestinationCalendarSelector {...props} />
          </div>
        </div>
      </div>
    </div>
  );
};

const DestinationCalendarSettingsHeading = () => {
  const { t } = useLocale();

  return (
    <div className="p-6">
      <h2 className="text-emphasis mb-1 text-base font-bold leading-5 tracking-wide">
        {t("add_to_calendar")}
      </h2>
      <p className="text-subtle text-sm leading-tight">{t("add_to_calendar_description")}</p>
    </div>
  );
};
