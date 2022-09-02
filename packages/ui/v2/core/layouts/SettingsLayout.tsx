import React, { ComponentProps } from "react";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Icon } from "../../../Icon";
import { useMeta } from "../Meta";
import Shell from "../Shell";
import SettingsSidebarContainer from "../navigation/SettingsSidebarContainer";

export default function SettingsLayout({
  children,
  ...rest
}: { children: React.ReactNode } & ComponentProps<typeof Shell>) {
  const { t } = useLocale();
  return (
    <Shell flexChildrenContainer {...rest} SidebarContainer={<SettingsSidebarContainer />}>
      <div className="f}lex-1 [&>*]:flex-1">
        <div className="mt-8 justify-center px-4 sm:px-6 md:px-8">
          <ShellHeader />
          {children}
        </div>
      </div>
    </Shell>
  );
}

export const getLayout = (page: React.ReactElement) => <SettingsLayout>{page}</SettingsLayout>;

function ShellHeader() {
  const { meta } = useMeta();
  const { t, isLocaleReady } = useLocale();
  return (
    <header className="mx-auto block max-w-4xl justify-between sm:flex lg:px-12 lg:pt-8">
      <div className="mb-8 w-full border-b border-gray-200 pb-8 lg:mb-0">
        {meta.title && isLocaleReady ? (
          <h1 className="font-cal mb-1 text-xl font-bold capitalize tracking-wide text-black">
            {t(meta.title)}
          </h1>
        ) : (
          <div className="mb-1 h-6 w-24 animate-pulse rounded-md bg-gray-200" />
        )}
        {meta.description && isLocaleReady ? (
          <p className="text-sm text-gray-600 ltr:mr-4 rtl:ml-4">{t(meta.description)}</p>
        ) : (
          <div className="mb-1 h-6 w-32 animate-pulse rounded-md bg-gray-200" />
        )}
      </div>
    </header>
  );
}
