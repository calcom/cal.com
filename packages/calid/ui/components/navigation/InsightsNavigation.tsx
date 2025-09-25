import getInsightTabs from "@calid/features/modules/insights/utils/getInsightTabs";
import { HorizontalTabs } from "@calid/features/ui/components/navigation";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useMemo } from "react";

import cs from "@calcom/ui/classNames";

const InsightsNavigation = ({
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
  const appCategories = useMemo(() => getInsightTabs(baseURL, useQueryParam), [baseURL, useQueryParam]);

  return (
    <div className={cs("flex flex-col", classNames?.root ?? className)}>
      <div className="block overflow-x-scroll">
        <HorizontalTabs tabs={appCategories} linkShallow />
      </div>
      <main className={classNames?.container ?? containerClassname} ref={animationRef}>
        {children}
      </main>
    </div>
  );
};

export default InsightsNavigation;
