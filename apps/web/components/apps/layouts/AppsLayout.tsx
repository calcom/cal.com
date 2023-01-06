import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import React, { ComponentProps } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { EmptyScreen, Icon, Shell, HorizontalTabs, HorizontalTabItemProps } from "@calcom/ui";

const tabs: HorizontalTabItemProps[] = [
  {
    name: "app_store",
    href: "/apps",
  },
  {
    name: "installed_apps",
    href: "/apps/installed",
  },
];

type AppsLayoutProps = {
  children: React.ReactNode;
  actions?: (className?: string) => JSX.Element;
  emptyStore?: boolean;
} & Omit<ComponentProps<typeof Shell>, "actions">;

export default function AppsLayout({ children, actions, emptyStore, ...rest }: AppsLayoutProps) {
  const { t } = useLocale();
  const session = useSession();
  const router = useRouter();

  if (session.status === "loading") return <></>;

  return (
    <Shell {...rest} actions={actions?.("hidden sm:block")}>
      <div className="flex flex-col xl:flex-row">
        <div className="block lg:hidden">
          <HorizontalTabs tabs={tabs} actions={actions?.("ml-6 mr-4 mt-3 block sm:hidden")} />
        </div>
        <main className="w-full">
          {emptyStore ? (
            <EmptyScreen
              Icon={Icon.FiAlertCircle}
              headline={t("no_apps")}
              description={session.data?.user.role === "ADMIN" ? "You can enable apps in the settings" : ""}
              buttonText={session.data?.user.role === "ADMIN" ? t("apps_settings") : ""}
              buttonOnClick={() => router.push("/settings/admin/apps/calendar")}
            />
          ) : (
            <>{children}</>
          )}
        </main>
      </div>
    </Shell>
  );
}
export const getLayout = (page: React.ReactElement) => <AppsLayout>{page}</AppsLayout>;
