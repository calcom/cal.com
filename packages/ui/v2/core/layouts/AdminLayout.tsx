import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import React, { ComponentProps, useEffect } from "react";

import { ErrorBoundary } from "../../..";
import Shell from "../Shell";
import SettingsLayout from "./SettingsLayout";
import { UserPermissionRole } from ".prisma/client";

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

  return (
    <SettingsLayout {...rest}>
      <div className="mx-auto flex max-w-4xl flex-row divide-y divide-gray-200">
        <div className="flex flex-1 [&>*]:flex-1">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </div>
    </SettingsLayout>
  );
}

export const getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;
