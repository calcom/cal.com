import { useMemo } from "react";

import { HorizontalTabs, VerticalTabs } from "@calcom/ui";

import getAppCategories from "../_utils/getAppCategories";

const AppCategoryNavigation = ({
  baseURL,
  children,
  containerClassname,
}: {
  baseURL: string;
  children: React.ReactNode;
  containerClassname: string;
}) => {
  const appCategories = useMemo(() => getAppCategories(baseURL), [baseURL]);

  return (
    <div className="flex w-0 flex-col p-2 md:p-0 xl:flex-row">
      <div className="hidden xl:block">
        <VerticalTabs tabs={appCategories} sticky linkProps={{ shallow: true }} />
      </div>
      <div className="block overflow-x-scroll xl:hidden">
        <HorizontalTabs tabs={appCategories} linkProps={{ shallow: true }} />
      </div>
      <main className={containerClassname}>{children}</main>
    </div>
  );
};

export default AppCategoryNavigation;
