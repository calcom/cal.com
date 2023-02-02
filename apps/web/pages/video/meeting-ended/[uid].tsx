import { NextPageContext } from "next";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { detectBrowserTimeFormat } from "@calcom/lib/timeFormat";
import prisma, { bookingMinimalSelect } from "@calcom/prisma";
import { Button, HeadSeo } from "@calcom/ui";
import { FiArrowRight, FiCalendar, FiX } from "@calcom/ui/components/icon";

import { inferSSRProps } from "@lib/types/inferSSRProps";

export default function MeetingUnavailable(props: inferSSRProps<typeof getServerSideProps>) {
  const { t } = useLocale();

  return (
    <div>
      <HeadSeo title="Meeting Unavailable" description="Meeting Unavailable" />
      <main className="mx-auto my-24 max-w-3xl">
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 my-4 transition-opacity sm:my-0" aria-hidden="true">
              <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">
                &#8203;
              </span>
              <div
                className="inline-block transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6 sm:align-middle"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-headline">
                <div>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <FiX className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-5">
                    <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-headline">
                      This meeting is in the past.
                    </h3>
                  </div>
                  <div className="mt-4 border-t border-b py-4">
                    <h2 className="font-cal mb-2 text-center text-lg font-medium text-gray-600">
                      {props.booking.title}
                    </h2>
                    <p className="text-center text-gray-500">
                      <FiCalendar className="mr-1 -mt-1 inline-block h-4 w-4" />
                      {dayjs(props.booking.startTime).format(detectBrowserTimeFormat + ", dddd DD MMMM YYYY")}
                    </p>
                  </div>
                </div>
                <div className="mt-5 text-center sm:mt-6">
                  <div className="mt-5">
                    <Button data-testid="return-home" href="/event-types" EndIcon={FiArrowRight}>
                      {t("go_back")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export async function getServerSideProps(context: NextPageContext) {
  const booking = await prisma.booking.findUnique({
    where: {
      uid: context.query.uid as string,
    },
    select: {
      ...bookingMinimalSelect,
      uid: true,
      user: {
        select: {
          credentials: true,
        },
      },
      references: {
        select: {
          uid: true,
          type: true,
          meetingUrl: true,
        },
      },
    },
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
