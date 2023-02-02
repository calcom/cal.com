import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useMemo } from "react";

import { classNames } from "@calcom/lib";
import { HorizontalTabs, VerticalTabs } from "@calcom/ui";

import getAppCategories from "../_utils/getAppCategories";

const AppCategoryNavigation = ({
  baseURL,
  children,
  containerClassname,
  className,
  fromAdmin,
  useQueryParam = false,
}: {
  baseURL: string;
  children: React.ReactNode;
  containerClassname: string;
  className?: string;
  fromAdmin?: boolean;
  useQueryParam?: boolean;
}) => {
  const [animationRef] = useAutoAnimate<HTMLDivElement>();
  const appCategories = useMemo(() => getAppCategories(baseURL, useQueryParam), [baseURL, useQueryParam]);

  return (
    <div className={classNames("flex flex-col gap-x-6 p-2 md:p-0 xl:flex-row", className)}>
      <div className="hidden xl:block">
        <VerticalTabs
          tabs={appCategories}
          sticky
          linkProps={{ shallow: true }}
          itemClassname={classNames(fromAdmin && "w-60")}
        />
      </div>
      <div className="mb-4 block overflow-x-scroll xl:hidden">
        <HorizontalTabs tabs={appCategories} linkProps={{ shallow: true }} />
      </div>
      <main className={containerClassname} ref={animationRef}>
        {children}
      </main>
    </div>
  );
};

export default AppCategoryNavigation;
