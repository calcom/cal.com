import Link from "next/link";

import { inferQueryOutput } from "@calcom/trpc/react";
import { Switch } from "@calcom/ui/v2";
import OmniInstallAppButton from "@calcom/web/components/v2/apps/OmniInstallAppButton";

import { SetAppDataGeneric } from "../EventTypeAppContext";
import { eventTypeAppCardZod } from "../eventTypeAppCardZod";

export default function AppCard({
  app,
  description,
  switchOnClick,
  switchChecked,
  children,
  setAppData,
}: {
  app: inferQueryOutput<"viewer.apps">[number];
  description?: React.ReactNode;
  switchChecked?: boolean;
  switchOnClick?: (e: boolean) => void;
  children?: React.ReactNode;
  setAppData: SetAppDataGeneric<typeof eventTypeAppCardZod>;
}) {
  return (
    <div className="mb-4 mt-2 rounded-md border border-gray-200 p-8 text-sm">
      <div className="flex w-full">
        {/* Don't know why but w-[42px] isn't working, started happening when I started using next/dynamic */}
        <Link href={"/apps/" + app.slug}>
          <a className="mr-3 h-auto w-10 rounded-sm">
            <img src={app?.logo} alt={app?.name} />
          </a>
        </Link>
        <div className="flex flex-col">
          <span className="font-semibold leading-none text-black">{app?.name}</span>
          <p className="pt-2 text-sm font-normal text-gray-600">{description || app?.description}</p>
        </div>
        {app?.isInstalled ? (
          <div className="ml-auto flex items-center">
            <Switch
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
          <OmniInstallAppButton className="ml-auto flex items-center" appId={app?.slug} />
        )}
      </div>
      {app?.isInstalled && switchChecked ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
