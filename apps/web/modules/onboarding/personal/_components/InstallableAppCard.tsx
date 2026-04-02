import type { UseAddAppMutationOptions } from "@calcom/app-store/_utils/useAddAppMutation";
import { InstallAppButtonWithoutPlanCheck } from "@calcom/app-store/InstallAppButtonWithoutPlanCheck";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { App } from "@calcom/types/App";
import { Button } from "@calcom/ui/components/button";

type AppData = {
  slug: string;
  name: string;
  description: string;
  logo: string;
  type: App["type"];
  userCredentialIds: number[];
};

type InstallableAppCardProps = {
  app: AppData;
  isInstalling: boolean;
  onInstallClick: (appSlug: string) => void;
  installOptions: UseAddAppMutationOptions;
};

export const InstallableAppCard = ({
  app,
  isInstalling,
  onInstallClick,
  installOptions,
}: InstallableAppCardProps) => {
  const { t } = useLocale();
  const isInstalled = app.userCredentialIds && app.userCredentialIds.length > 0;

  return (
    <div className="border-subtle bg-default relative flex flex-col items-start gap-4 rounded-xl border p-5">
      {isInstalled && (
        <span className="bg-success text-success absolute right-2 top-2 rounded-md px-2 py-1 text-xs font-medium">
          {t("connected")}
        </span>
      )}
      {app.logo && <img src={app.logo} alt={app.name} className="h-9 w-9 rounded-md" />}
      <p className="text-default line-clamp-1 break-words text-left text-sm font-medium" title={app.name}>
        {app.name}
      </p>
      <InstallAppButtonWithoutPlanCheck
        type={app.type}
        options={installOptions}
        render={(buttonProps) => (
          <Button
            {...buttonProps}
            color="secondary"
            disabled={isInstalled}
            type="button"
            loading={isInstalling || buttonProps?.loading}
            className="mt-auto w-full items-center justify-center rounded-[10px]"
            onClick={(event) => {
              // Save cookie to return to this page after OAuth
              document.cookie = `return-to=${window.location.href};path=/;max-age=3600;SameSite=Lax`;
              onInstallClick(app.slug);
              buttonProps?.onClick?.(event);
            }}>
            {isInstalled ? t("connected") : t("connect")}
          </Button>
        )}
      />
    </div>
  );
};
