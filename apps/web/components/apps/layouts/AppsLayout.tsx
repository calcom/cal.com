import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import React from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";

import Shell from "~/shell/Shell";

type AppsLayoutProps = {
  children: React.ReactNode;
  isAdmin: boolean;
  actions?: (className?: string) => JSX.Element;
  emptyStore?: boolean;
} & Omit<ComponentProps<typeof Shell>, "actions">;

export default function AppsLayout({ children, actions, emptyStore, isAdmin, ...rest }: AppsLayoutProps) {
  const { t } = useLocale();
  const router = useRouter();

  return (
    <Shell {...rest} actions={actions?.("block")}>
      <div className="flex flex-col xl:flex-row">
        <main className="w-full">
          {emptyStore ? (
            <EmptyScreen
              Icon="circle-alert"
              headline={isAdmin ? t("no_apps") : t("no_apps_configured")}
              description={isAdmin ? t("enable_in_settings") : t("please_contact_admin")}
              buttonText={isAdmin ? t("apps_settings") : ""}
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
