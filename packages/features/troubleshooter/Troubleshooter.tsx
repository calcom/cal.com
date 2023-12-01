import StickyBox from "react-sticky-box";

import classNames from "@calcom/lib/classNames";
import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";

import { LargeCalendar } from "./components/LargeCalendar";
import { TroubleshooterHeader } from "./components/TroubleshooterHeader";
import { TroubleshooterSidebar } from "./components/TroubleshooterSidebar";
import { useInitalizeTroubleshooterStore } from "./store";
import type { TroubleshooterProps } from "./types";

const extraDaysConfig = {
  desktop: 7,
  tablet: 4,
};

const TroubleshooterComponent = ({ month }: TroubleshooterProps) => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");
  const extraDays = isTablet ? extraDaysConfig.tablet : extraDaysConfig.desktop;

  useInitalizeTroubleshooterStore({
    month: month,
  });

  return (
    <>
      <div
        className={classNames(
          "text-default fixed inset-0 grid min-h-full w-full flex-col items-center overflow-clip ",
          isMobile
            ? "[--troublehooster-meta-width:0px]"
            : "[--troublehooster-meta-width:250px] lg:[--troubleshooter-meta-width:430px]"
        )}>
        <div
          style={{
            width: "100vw",
            minHeight: "100vh",
            height: "auto",
            gridTemplateAreas: `
          "meta header header"
          "meta main main"
          `,
            gridTemplateColumns: "var(--troubleshooter-meta-width) 1fr",
            gridTemplateRows: "70px auto",
          }}
          className={classNames(
            "bg-default dark:bg-muted grid max-w-full items-start dark:[color-scheme:dark] sm:transition-[width] sm:duration-300 sm:motion-reduce:transition-none md:flex-row "
          )}>
          <div className={classNames("bg-default dark:bg-muted sticky top-0 z-10 [grid-area:header]")}>
            <TroubleshooterHeader extraDays={extraDays} isMobile={isMobile} />
          </div>
          <StickyBox key="meta" className={classNames("relative z-10")}>
            <div className="ps-6">
              <TroubleshooterSidebar />
            </div>
          </StickyBox>

          <div className="border-subtle sticky top-0 ml-[-1px] h-full [grid-area:main] md:border-l ">
            <LargeCalendar extraDays={extraDays} />
          </div>
        </div>
      </div>
    </>
  );
};

export const Troubleshooter = ({ month }: TroubleshooterProps) => {
  return <TroubleshooterComponent month={month} />;
};
