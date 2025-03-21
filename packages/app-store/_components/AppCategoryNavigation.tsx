import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useMemo } from "react";

import cs from "@calcom/ui/classNames";
import { HorizontalTabs, VerticalTabs } from "@calcom/ui/components/navigation";

import getAppCategories from "../_utils/getAppCategories";

const AppCategoryNavigation = ({
  baseURL,
  children,
  containerClassname,
  className,
  classNames,
  useQueryParam = false,
}: {
  baseURL: string;
  children: React.ReactNode;
  /** @deprecated use classNames instead */
  containerClassname?: string;
  /** @deprecated use classNames instead */
  className?: string;
  classNames?: {
    root?: string;
    container?: string;
    verticalTabsItem?: string;
  };
  useQueryParam?: boolean;
}) => {
  const [animationRef] = useAutoAnimate<HTMLDivElement>();
  const appCategories = useMemo(() => getAppCategories(baseURL, useQueryParam), [baseURL, useQueryParam]);

  return (
    <div className={cs("flex flex-col xl:flex-row xl:space-x-6", classNames?.root ?? className)}>
      <div className="hidden xl:block">
        <VerticalTabs tabs={appCategories} sticky linkShallow itemClassname={classNames?.verticalTabsItem} />
      </div>
      <div className="block overflow-x-scroll xl:hidden">
        <HorizontalTabs tabs={appCategories} linkShallow />
      </div>
      <main className={classNames?.container ?? containerClassname} ref={animationRef}>
        {children}
      </main>
    </div>
  );
};

export default AppCategoryNavigation;
