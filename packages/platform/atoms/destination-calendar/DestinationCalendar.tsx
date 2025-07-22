import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Label } from "@calcom/ui/components/form";

import { cn } from "../src/lib/utils";
import type { DestinationCalendarProps } from "./DestinationCalendarSelector";
import { DestinationCalendarSelector } from "./DestinationCalendarSelector";

export const DestinationCalendarSettings = (
  props: DestinationCalendarProps & {
    classNames?:
      | {
          container?: string;
          headingContainer?: string;
          headingTitle?: string;
          headingDescription?: string;
          contentContainer?: string;
          labelClassName?: string;
          selectorClassName?: string;
        }
      | string;
  }
) => {
  const { t } = useLocale();

  const classNamesObj =
    typeof props?.classNames === "string" ? { container: props.classNames } : props?.classNames;

  return (
    <div className={cn("border-subtle mb-6 mt-8 rounded-lg border", classNamesObj?.container)}>
      <DestinationCalendarSettingsHeading classNames={classNamesObj} />
      <div className={cn("border-t", classNamesObj?.contentContainer)}>
        <div className="border-subtle flex w-full flex-col space-y-3 border-y-0 p-6">
          <div>
            <Label className={cn("text-default mb-0 font-medium", classNamesObj?.labelClassName)}>
              {t("add_events_to")}
            </Label>
            <DestinationCalendarSelector {...props} />
          </div>
        </div>
      </div>
    </div>
  );
};

const DestinationCalendarSettingsHeading = ({
  classNames,
}: {
  classNames?: {
    headingContainer?: string;
    headingTitle?: string;
    headingDescription?: string;
  };
}) => {
  const { t } = useLocale();

  return (
    <div className={cn("p-6", classNames?.headingContainer)}>
      <h2
        className={cn(
          "text-emphasis mb-1 text-base font-bold leading-5 tracking-wide",
          classNames?.headingTitle
        )}>
        {t("add_to_calendar")}
      </h2>
      <p className={cn("text-subtle text-sm leading-tight", classNames?.headingDescription)}>
        {t("add_to_calendar_description")}
      </p>
    </div>
  );
};
