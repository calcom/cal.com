import { useMemo } from "react";

import { HorizontalTabs, VerticalTabs } from "@calcom/ui/v2";

import getAppCategories from "../_utils/getAppCategories";

const AppCategoryNavigation = ({ baseURL, children }: { baseURL: string; children: React.ReactNode }) => {
  const appCategories = useMemo(() => getAppCategories(baseURL), [baseURL]);

  return (
    <div className="flex flex-col p-2 md:p-0 xl:flex-row">
      <div className="hidden xl:block">
        <VerticalTabs tabs={appCategories} sticky linkProps={{ shallow: true }} />
      </div>
      <div className="block xl:hidden">
        <HorizontalTabs tabs={appCategories} linkProps={{ shallow: true }} />
      </div>
      <main className="w-full xl:mx-5 xl:w-4/5 xl:pr-5">{children}</main>
    </div>
  );
};

export default AppCategoryNavigation;
