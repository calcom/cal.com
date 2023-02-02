import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import React, { ComponentProps } from "react";

import Shell from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { EmptyScreen } from "@calcom/ui";
import { FiAlertCircle } from "@calcom/ui/components/icon";

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
    <Shell {...rest} actions={actions?.("block")}>
      <div className="flex flex-col xl:flex-row">
        <main className="w-full">
          {emptyStore ? (
            <EmptyScreen
              Icon={FiAlertCircle}
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
