import { useAutoAnimate } from "@formkit/auto-animate/react";
import Link from "next/link";

import { classNames } from "@calcom/lib";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Switch } from "@calcom/ui";

import type { SetAppDataGeneric } from "../EventTypeAppContext";
import type { eventTypeAppCardZod } from "../eventTypeAppCardZod";
import OmniInstallAppButton from "./OmniInstallAppButton";

export default function AppCard({
  app,
  description,
  switchOnClick,
  switchChecked,
  children,
  setAppData,
  returnTo,
}: {
  app: RouterOutputs["viewer"]["apps"][number];
  description?: React.ReactNode;
  switchChecked?: boolean;
  switchOnClick?: (e: boolean) => void;
  children?: React.ReactNode;
  setAppData: SetAppDataGeneric<typeof eventTypeAppCardZod>;
  returnTo?: string;
}) {
  const [animationRef] = useAutoAnimate<HTMLDivElement>();

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
            href={"/apps/" + app.slug}
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
          <div className="pe-3 flex flex-col">
            <div className="text-emphasis">
              <span className={classNames(app?.isInstalled && "text-base", "font-semibold leading-4")}>
                {app?.name}
              </span>
              {!app?.isInstalled && (
                <span className="bg-emphasis ml-1 rounded py-0.5 px-1 text-xs font-medium leading-3 tracking-[0.01em]">
                  {app?.categories[0].charAt(0).toUpperCase() + app?.categories[0].slice(1)}
                </span>
              )}
            </div>
            <p title={app?.description} className="line-clamp-1 text-default pt-1 text-sm font-normal">
              {description || app?.description}
            </p>
          </div>
          {app?.isInstalled ? (
            <div className="ml-auto flex items-center">
              <Switch
                disabled={!app.enabled}
                onCheckedChange={(enabled) => {
                  if (switchOnClick) {
                    switchOnClick(enabled);
                  }
                  setAppData("enabled", enabled);
                }}
                checked={switchChecked}
              />
            </div>
          ) : (
            <OmniInstallAppButton
              className="ml-auto flex items-center"
              appId={app.slug}
              returnTo={returnTo}
            />
          )}
        </div>
      </div>
      <div ref={animationRef}>
        {app?.isInstalled && switchChecked && <hr className="border-subtle" />}
        {app?.isInstalled && switchChecked ? (
          <div className="p-4 pt-5 text-sm [&_input]:mb-0 [&_input]:leading-4">{children}</div>
        ) : null}
      </div>
    </div>
  );
}
