import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import React, { useEffect } from "react";

import SettingsLayout from "@calcom/features/settings/layouts/SettingsLayout";
import type Shell from "@calcom/features/shell/Shell";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { ErrorBoundary } from "@calcom/ui";

export default function AdminLayout({
  children,
  ...rest
}: { children: React.ReactNode } & ComponentProps<typeof Shell>) {
  const pathname = usePathname();
  const session = useSession();
  const router = useRouter();

  // Force redirect on component level
  useEffect(() => {
    if (session.data && session.data.user.role !== UserPermissionRole.ADMIN) {
      router.replace("/settings/my-account/profile");
    }
  }, [session, router]);

  const isAppsPage = pathname?.startsWith("/settings/admin/apps");
  return (
    <SettingsLayout {...rest}>
      <div className="divide-subtle mx-auto flex max-w-4xl flex-row divide-y">
        <div className={isAppsPage ? "min-w-0" : "flex flex-1 [&>*]:flex-1"}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </div>
    </SettingsLayout>
  );
}

export const getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;
