import { useMemo } from "react";

import { classNames } from "@calcom/lib";
import { HorizontalTabs, VerticalTabs } from "@calcom/ui";

import getAppCategories from "../_utils/getAppCategories";

const AppCategoryNavigation = ({
  baseURL,
  children,
  containerClassname,
  className,
}: {
  baseURL: string;
  children: React.ReactNode;
  containerClassname: string;
  className?: string;
}) => {
  const appCategories = useMemo(() => getAppCategories(baseURL), [baseURL]);

  return (
    <div className={classNames("flex flex-col p-2 md:p-0 xl:flex-row", className)}>
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
