import type { NextPageContext } from "next";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { detectBrowserTimeFormat } from "@calcom/lib/timeFormat";
import prisma, { bookingMinimalSelect } from "@calcom/prisma";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Button, HeadSeo, EmptyScreen } from "@calcom/ui";
import { ArrowRight, Calendar, Clock } from "@calcom/ui/components/icon";

export default function MeetingNotStarted(props: inferSSRProps<typeof getServerSideProps>) {
  const { t } = useLocale();
  return (
    <>
      <HeadSeo title={t("this_meeting_has_not_started_yet")} description={props.booking.title} />
      <main className="mx-auto my-24 max-w-3xl">
        <EmptyScreen
          Icon={Clock}
          headline={t("this_meeting_has_not_started_yet")}
          description={
            <>
              <h2 className="mb-2 text-center font-medium">{props.booking.title}</h2>
              <p className="text-subtle text-center">
                <Calendar className="mr-1 -mt-1 inline-block h-4 w-4" />
                {dayjs(props.booking.startTime).format(detectBrowserTimeFormat + ", dddd DD MMMM YYYY")}
              </p>
            </>
          }
          buttonRaw={
            <Button data-testid="return-home" href="/event-types" EndIcon={ArrowRight}>
              {t("go_back")}
            </Button>
          }
        />
      </main>
    </>
  );
}

export async function getServerSideProps(context: NextPageContext) {
  const booking = await prisma.booking.findUnique({
    where: {
      uid: context.query.uid as string,
    },
    select: bookingMinimalSelect,
  });

  if (!booking) {
    return {
      redirect: {
        destination: "/video/no-meeting-found",
        permanent: false,
      },
    };
  }

  const bookingObj = Object.assign({}, booking, {
    startTime: booking.startTime.toString(),
    endTime: booking.endTime.toString(),
  });

  return {
    props: {
      booking: bookingObj,
    },
  };
}
