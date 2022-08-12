import { InstallAppButton, InstallAppButtonWithoutPlanCheck } from "@calcom/app-store/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { App } from "@calcom/types/App";

interface ICalendarItem {
  title: string;
  description?: string;
  imageSrc: string;
  type: App["type"];
}

const CalendarItem = (props: ICalendarItem) => {
  const { title, description, imageSrc, type } = props;
  const { t } = useLocale();
  return (
    <div className="flex flex-row items-center p-5">
      <img src={imageSrc} alt={title} className="h-8 w-8" />
      <p className="mx-3 text-sm font-bold">{title}</p>
      {/* <p>{description}</p> */}

      <InstallAppButtonWithoutPlanCheck
        type={type}
        render={(buttonProps) => (
          <button
            {...buttonProps}
            type="button"
            className="ml-auto rounded-md border border-gray-200 py-[10px] px-4 text-sm font-bold">
            {t("connect")}
          </button>
        )}
        // onChanged={() => props.onChanged()}
      />
    </div>
  );
};

export { CalendarItem };
