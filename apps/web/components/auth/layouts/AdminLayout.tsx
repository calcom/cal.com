import { UserPermissionRole } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import type { ComponentProps } from "react";
import React, { useEffect } from "react";

import SettingsLayout from "@calcom/features/settings/layouts/SettingsLayout";
import type Shell from "@calcom/features/shell/Shell";
import { ErrorBoundary } from "@calcom/ui";

export default function AdminLayout({
  children,

  ...rest
}: { children: React.ReactNode } & ComponentProps<typeof Shell>) {
  const session = useSession();
  const router = useRouter();

  // Force redirect on component level
  useEffect(() => {
    if (session.data && session.data.user.role !== UserPermissionRole.ADMIN) {
      router.replace("/settings/my-account/profile");
    }
  }, [session, router]);

  const isAppsPage = router.asPath.startsWith("/settings/admin/apps");
  return (
    <SettingsLayout {...rest}>
      <div className="mx-auto flex max-w-4xl flex-row divide-y divide-gray-200">
        <div className={isAppsPage ? "min-w-0" : "flex flex-1 [&>*]:flex-1"}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </div>
    </SettingsLayout>
  );
}

export const getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;
