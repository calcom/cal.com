import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Label } from "@calcom/ui/components/form";

import { cn } from "../src/lib/utils";
import type { DestinationCalendarProps } from "./DestinationCalendarSelector";
import { DestinationCalendarSelector } from "./DestinationCalendarSelector";

type DestinationHeaderClassnames = {
  container?: string;
  title?: string;
  description?: string;
};

export type DestinationCalendarClassNames = {
  container?: string;
  header?: DestinationHeaderClassnames;
};

export const DestinationCalendarSettings = (
  props: DestinationCalendarProps & { classNames?: string; classNamesObject?: DestinationCalendarClassNames }
) => {
  const { t } = useLocale();

  return (
    <div
      className={cn(
        "border-subtle mb-6 mt-8 rounded-lg border",
        props?.classNames || props?.classNamesObject?.container
      )}>
      <DestinationCalendarSettingsHeading classNames={props.classNamesObject?.header} />
      <div className="border-t">
        <div className="border-subtle flex w-full flex-col stack-y-3 border-y-0 p-6">
          <div>
            <Label className="text-default mb-0 font-medium">{t("add_events_to")}</Label>
            <DestinationCalendarSelector {...props} />
          </div>
        </div>
      </div>
    </div>
  );
};

const DestinationCalendarSettingsHeading = ({ classNames }: { classNames?: DestinationHeaderClassnames }) => {
  const { t } = useLocale();

  return (
    <div className={cn("p-6", classNames?.container)}>
      <h2 className={cn("text-emphasis mb-1 text-base font-bold leading-5 tracking-wide", classNames?.title)}>
        {t("add_to_calendar")}
      </h2>
      <p className={cn("text-subtle text-sm leading-tight", classNames?.description)}>
        {t("add_to_calendar_description")}
      </p>
    </div>
  );
};
