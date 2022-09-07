import { InstallAppButtonWithoutPlanCheck } from "@calcom/app-store/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { App } from "@calcom/types/App";
import Button from "@calcom/ui/v2/core/Button";

interface ICalendarItem {
  title: string;
  description?: string;
  imageSrc: string;
  type: App["type"];
}

const CalendarItem = (props: ICalendarItem) => {
  const { title, imageSrc, type } = props;
  const { t } = useLocale();
  return (
    <div className="flex flex-row items-center p-5">
      <img src={imageSrc} alt={title} className="h-8 w-8" />
      <p className="mx-3 text-sm font-bold">{title}</p>

      <InstallAppButtonWithoutPlanCheck
        type={type}
        render={(buttonProps) => (
          <Button
            {...buttonProps}
            color="secondary"
            type="button"
            onClick={(event) => {
              // Save cookie key to return url step
              document.cookie = `return-to=${window.location.href};path=/;max-age=3600`;
              buttonProps && buttonProps.onClick && buttonProps?.onClick(event);
            }}
            className="ml-auto rounded-md border border-gray-200 py-[10px] px-4 text-sm font-bold">
            {t("connect")}
          </Button>
        )}
      />
    </div>
  );
};

export { CalendarItem };
