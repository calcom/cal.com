import { Parallax, useParallax } from "react-scroll-parallax";

import { getLayout } from "@calcom/features/MainLayout";
import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";
import { ShellMain } from "@calcom/features/shell/Shell";
import {
  DailyMinutesBarChart,
  MonthlyMinutesBarChart,
  TimeOfDayCards,
  MinutesBlock,
  AttendeesBlock,
  BusiestDayBlock,
  WorkflowsBlock,
  EventTypesBlock,
  RoutingFormBlock,
  TopRoutingFormBlock,
  BookingStatusBlock,
  StreaksBlock,
} from "@calcom/features/time-capsule/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import type { inferSSRProps } from "@lib/types/inferSSRProps";

import PageWrapper from "@components/PageWrapper";

export type PageProps = inferSSRProps<typeof getServerSideProps>;
export default function TimeCapsulePage() {
  const { t } = useLocale();

  const titleParallax = useParallax<HTMLDivElement>({
    easing: "easeOutQuad",
    translateY: [0, 50],
  });

  return (
    <div>
      <ShellMain heading="" subtitle="">
        <div className="text-center">
          <h1
            className="font-cal text-emphasis mt-2 h-screen text-8xl font-extrabold sm:text-8xl"
            ref={titleParallax.ref}>
            Time Capsule 2023
          </h1>
          <Parallax className="h-[60vh]" translateY={[0, 100]} easing="easeInOut">
            <MinutesBlock />
          </Parallax>

          <br />
          <Parallax className="h-[60vh]" translateY={[0, 100]} easing="easeInOut">
            <AttendeesBlock />
          </Parallax>

          <br />
          <Parallax className="h-[60vh]" translateY={[0, 100]} easing="easeInOut">
            <BusiestDayBlock />
          </Parallax>

          <br />
          <Parallax className="h-[60vh]" translateY={[0, 60]} easing="easeInOut">
            <MonthlyMinutesBarChart />
          </Parallax>

          <br />
          <Parallax className="h-[60vh]" translateY={[0, 60]} easing="easeInOut">
            <DailyMinutesBarChart />
          </Parallax>

          <br />
          <Parallax className="h-[40vh]" translateY={[0, 60]} easing="easeInOut">
            <TimeOfDayCards />
          </Parallax>
          <br />
          <Parallax className="h-[40vh]" translateY={[0, 60]} easing="easeInOut">
            <StreaksBlock />
          </Parallax>

          <br />
          <Parallax className="h-[40vh]" translateY={[0, 100]} easing="easeInOut">
            <BookingStatusBlock />
          </Parallax>

          <br />
          <Parallax className="h-[40vh]" translateY={[0, 100]} easing="easeInOut">
            <EventTypesBlock />
          </Parallax>

          <br />
          <Parallax className="h-[40vh]" translateY={[0, 100]} easing="easeInOut">
            <WorkflowsBlock />
          </Parallax>

          <br />
          <Parallax className="h-[40vh]" translateY={[0, 100]} easing="easeInOut">
            <RoutingFormBlock />
          </Parallax>

          <br />
          <Parallax className="h-[40vh]" translateY={[0, 100]} easing="easeInOut">
            <TopRoutingFormBlock />
          </Parallax>
          <br />
          <Parallax className="h-[20vh]" translateY={[0, 50]} easing="easeInOut">
            <h1 className="font-cal text-emphasis mt-2 text-4xl font-extrabold sm:text-5xl">
              <strong className="text-blue-500"> 2023</strong> was your time, your way.
              <br /> Continue to make time work for you in
              <strong className="text-blue-500"> 2024</strong>!
            </h1>
          </Parallax>
        </div>
      </ShellMain>
    </div>
  );
}

TimeCapsulePage.PageWrapper = PageWrapper;
TimeCapsulePage.getLayout = getLayout;

// If feature flag is disabled, return not found on getServerSideProps
export const getServerSideProps = async () => {
  const prisma = await import("@calcom/prisma").then((mod) => mod.default);
  const flags = await getFeatureFlagMap(prisma);

  if (flags.insights === false) {
    return {
      notFound: true,
    };
  }

  return {
    props: {},
  };
};
