import { useState } from "react";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, EmptyScreen, HeadSeo } from "@calcom/ui";
import { FiX, FiArrowRight, FiChevronRight } from "@calcom/ui/components/icon";

export default function NoMeetingFound() {
  const { t } = useLocale();

  return (
    <>
      <HeadSeo title={t("no_meeting_found")} description={t("no_meeting_found")} />
      <main className="mx-auto my-24 max-w-3xl">
        <EmptyScreen
          Icon={FiX}
          headline={t("no_meeting_found")}
          description={t("no_meeting_found_description")}
          buttonRaw={
            <Button data-testid="return-home" href="/event-types" EndIcon={FiArrowRight}>
              {t("go_back_home")}
            </Button>
          }
        />
      </main>
      <VideoMeetingInfo />
      <iframe src="https://cal.video/hJ3fD81SfXT8wL3nEu0N" className="h-[100vh] w-full" />
    </>
  );
}

function VideoMeetingInfo() {
  const [open, setOpen] = useState(false);

  const progress = 20; // in percent

  return (
    <>
      <aside
        className={classNames(
          "fixed top-0 z-30 flex h-full w-64 transform justify-between border-r border-gray-300/20 bg-black/80 backdrop-blur-lg transition-all duration-300 ease-in-out",
          open ? "left-0" : "-left-64"
        )}>
        <main className="prose prose-sm max-w-64 prose-h3:text-white prose-h3:font-cal overflow-scroll p-4 text-white shadow-sm">
          <h3>What:</h3>
          <p>30 Minute Meeting</p>
          <h3>Invitee Time Zone:</h3>
          <p>America/Detroit</p>
          <h3>When:</h3>
          <p>
            Thursday 23rd February 2023 <br />
            11:10 am (CET)
          </p>
          <h3>Who:</h3>
          <p>Peer Richelsen - Organizer peer@cal.com</p>
          <p>sunil pai, inc. – sunil@partykit.io</p>
          <h3>Description</h3>
          <p>With Peer Richelsen, Co-Founder & Co-CEO of Cal.com</p>
          <h3>Time left</h3>
          <p>23 minutes</p>
          <div className="relative h-3 max-w-xl overflow-hidden rounded-full">
            <div className="absolute h-full w-full bg-gray-200" />
            <div id="bar" className={classNames("relative h-full bg-green-500", `w-[${progress}%]`)} />
          </div>
        </main>
        <div className="-mr-6 flex items-center justify-center">
          <button
            className="h-20 w-6 rounded-r-md border border-l-0 border-gray-300/20 bg-black/60 text-white shadow-sm backdrop-blur-lg"
            onClick={() => setOpen(!open)}>
            <FiChevronRight
              className={classNames(open && "rotate-180", "w-5 transition-all duration-300 ease-in-out")}
            />
          </button>
        </div>
      </aside>
    </>
  );
}
