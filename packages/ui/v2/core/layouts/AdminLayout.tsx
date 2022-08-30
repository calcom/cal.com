import React, { ComponentProps } from "react";

import Shell from "../Shell";
import SettingsLayout from "./SettingsLayout";

export default function AdminLayout({
  children,
  ...rest
}: { children: React.ReactNode } & ComponentProps<typeof Shell>) {
  return (
    <SettingsLayout {...rest}>
      <div className="mx-auto flex max-w-4xl flex-row divide-y divide-gray-200 lg:p-12">
        <div className="flex flex-1 [&>*]:flex-1">{children}</div>
      </div>
    </SettingsLayout>
  );
}

export const getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;
