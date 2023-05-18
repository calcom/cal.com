import { InstallAppButtonWithoutPlanCheck } from "@calcom/app-store/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { App } from "@calcom/types/App";
import { Button } from "@calcom/ui";

interface IAppConnectionItem {
  title: string;
  description?: string;
  logo: string;
  type: App["type"];
  installed?: boolean;
}

const AppConnectionItem = (props: IAppConnectionItem) => {
  const { title, logo, type, installed } = props;
  const { t } = useLocale();
  return (
    <div className="flex flex-row items-center justify-between p-5">
      <div className="flex items-center space-x-3">
        <img src={logo} alt={title} className="h-8 w-8" />
        <p className="text-sm font-bold">{title}</p>
      </div>
      <InstallAppButtonWithoutPlanCheck
        type={type}
        render={(buttonProps) => (
          <Button
            {...buttonProps}
            color="secondary"
            disabled={installed}
            type="button"
            onClick={(event) => {
              // Save cookie key to return url step
              document.cookie = `return-to=${window.location.href};path=/;max-age=3600;SameSite=Lax`;
              buttonProps && buttonProps.onClick && buttonProps?.onClick(event);
            }}>
            {installed ? t("installed") : t("connect")}
          </Button>
        )}
      />
    </div>
  );
};

export { AppConnectionItem };
