import { inferQueryOutput } from "@calcom/trpc/react";
import { Switch, Skeleton } from "@calcom/ui/v2";
import OmniInstallAppButton from "@calcom/web/components/v2/apps/OmniInstallAppButton";

export default function AppCard({
  app,
  description,
  switchOnClick,
  switchChecked,
  children,
}: {
  app: inferQueryOutput<"viewer.apps">[number];
  description?: React.ReactNode;
  switchChecked?: boolean;
  switchOnClick?: (e: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-4 rounded-md border border-gray-200 p-8">
      <div className="flex w-full">
        {/* Don't know why but w-[42px] isn't working, started happening when I started using next/dynamic */}
        <img src={app?.logo} alt={app?.name} className="mr-3 h-auto w-10 rounded-sm" />
        <div className="flex flex-col">
          <span className="font-semibold leading-none text-black">{app?.name}</span>
          <p className="pt-2 text-sm font-normal text-gray-600">{description || app?.description}</p>
        </div>
        {app?.isInstalled ? (
          <div className="ml-auto flex items-center">
            <Switch onCheckedChange={switchOnClick} checked={switchChecked} />
          </div>
        ) : (
          <OmniInstallAppButton className="ml-auto flex items-center" appId={app?.slug} />
        )}
      </div>
      {children}
    </div>
  );
}
