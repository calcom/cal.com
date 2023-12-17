import { useAutoAnimate } from "@formkit/auto-animate/react";
import Link from "next/link";
import { useTranslation } from "react-i18next";

import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import { classNames } from "@calcom/lib";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Switch, Badge, Avatar, Button } from "@calcom/ui";
import { Settings } from "@calcom/ui/components/icon";

import type { CredentialOwner } from "../types";
import OmniInstallAppButton from "./OmniInstallAppButton";

export default function AppCard({
  app,
  description,
  switchOnClick,
  switchChecked,
  children,
  returnTo,
  teamId,
}: {
  app: RouterOutputs["viewer"]["integrations"]["items"][number] & { credentialOwner?: CredentialOwner };
  description?: React.ReactNode;
  switchChecked?: boolean;
  switchOnClick?: (e: boolean) => void;
  children?: React.ReactNode;
  returnTo?: string;
  teamId?: number;
  LockedIcon?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const [animationRef] = useAutoAnimate<HTMLDivElement>();
  const { setAppData, LockedIcon, disabled } = useAppContextWithSchema();

  return (
    <div
      className={classNames(
        "border-subtle",
        app?.isInstalled && "mb-4 rounded-md border",
        !app.enabled && "grayscale"
      )}>
      <div className={classNames(app.isInstalled ? "p-4 text-sm sm:p-4" : "px-5 py-4 text-sm sm:px-5")}>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:gap-0">
          {/* Don't know why but w-[42px] isn't working, started happening when I started using next/dynamic */}
          <Link
            href={`/apps/${app.slug}`}
            className={classNames(app?.isInstalled ? "mr-[11px]" : "mr-3", "h-auto w-10 rounded-sm")}>
            <img
              className={classNames(
                app?.logo.includes("-dark") && "dark:invert",
                app?.isInstalled ? "min-w-[42px]" : "min-w-[40px]",
                "w-full"
              )}
              src={app?.logo}
              alt={app?.name}
            />
          </Link>
          <div className="flex flex-col pe-3">
            <div className="text-emphasis">
              <span className={classNames(app?.isInstalled && "text-base", "font-semibold leading-4")}>
                {app?.name}
              </span>
              {!app?.isInstalled && (
                <span className="bg-emphasis ml-1 rounded px-1 py-0.5 text-xs font-medium leading-3 tracking-[0.01em]">
                  {app?.categories[0].charAt(0).toUpperCase() + app?.categories[0].slice(1)}
                </span>
              )}
            </div>
            <p title={app?.description} className="text-default line-clamp-1 pt-1 text-sm font-normal">
              {description || app?.description}
            </p>
          </div>
          <div className="ml-auto flex items-center space-x-2">
            {app.credentialOwner && (
              <div className="ml-auto">
                <Badge variant="gray">
                  <div className="flex items-center">
                    <Avatar
                      className="mr-2"
                      alt={app.credentialOwner.name || "Credential Owner Name"}
                      size="sm"
                      imageSrc={app.credentialOwner.avatar}
                    />
                    {app.credentialOwner.name}
                  </div>
                </Badge>
              </div>
            )}
            {app?.isInstalled || app.credentialOwner ? (
              <div className="ml-auto flex items-center">
                <Switch
                  data-testid="app-switch"
                  disabled={!app.enabled || disabled}
                  onCheckedChange={(enabled) => {
                    if (switchOnClick) {
                      switchOnClick(enabled);
                    }
                    setAppData("enabled", enabled);
                  }}
                  checked={switchChecked}
                  LockedIcon={LockedIcon}
                />
              </div>
            ) : (
              <OmniInstallAppButton
                className="ml-auto flex items-center"
                appId={app.slug}
                returnTo={returnTo}
                teamId={teamId}
              />
            )}
          </div>
        </div>
      </div>
      <div ref={animationRef}>
        {app?.isInstalled && switchChecked && <hr className="border-subtle" />}

        {app?.isInstalled && switchChecked ? (
          app.isSetupAlready === undefined || app.isSetupAlready ? (
            <div className="relative p-4 pt-5 text-sm [&_input]:mb-0 [&_input]:leading-4">
              <Link href={`/apps/${app.slug}/setup`} className="absolute right-4 top-4">
                <Settings className="text-default h-4 w-4" aria-hidden="true" />
              </Link>
              {children}
            </div>
          ) : (
            <div className="flex h-64 w-full flex-col items-center justify-center gap-4 ">
              <p>{t("this_app_is_not_setup_already")}</p>
              <Link href={`/apps/${app.slug}/setup`}>
                <Button StartIcon={Settings}>{t("setup")}</Button>
              </Link>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
