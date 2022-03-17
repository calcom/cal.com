import { CalendarIcon, XIcon } from "@heroicons/react/outline";
import { ArrowRightIcon } from "@heroicons/react/solid";
import dayjs from "dayjs";
import { NextPageContext } from "next";
import { getSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import Button from "@calcom/ui/Button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/Dialog";

import prisma from "@lib/prisma";
import { detectBrowserTimeFormat } from "@lib/timeFormat";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import { HeadSeo } from "@components/seo/head-seo";

export default function MeetingNotStarted(props: inferSSRProps<typeof getServerSideProps>) {
  const router = useRouter();
  const { t } = useLocale();
  //if no booking redirectis to the 404 page
  const emptyBooking = props.booking === null;
  useEffect(() => {
    if (emptyBooking) {
      router.push("/video/no-meeting-found");
    }
  });
  if (!emptyBooking) {
    return (
      <div>
        <HeadSeo title={`Meeting Unavaialble`} description={`Meeting Unavailable`} />
        <main className="mx-auto my-24 max-w-3xl">
          <Dialog defaultOpen={true}>
            <DialogContent
              onInteractOutside={(e) => {
                e.preventDefault();
              }}>
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <XIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="mt-5 flex justify-center">
                <DialogHeader title={props.booking.title} />
              </div>
              <p className="-mt-4 flex items-center justify-center text-sm text-gray-500">
                <CalendarIcon className="mr-1 inline-block h-4 w-4" />
                {dayjs(props.booking.startTime).format(detectBrowserTimeFormat + ", dddd DD MMMM YYYY")}
              </p>
              <p className="flex justify-center text-center text-sm text-gray-500">
                This meeting will be accessible 60 minutes in advance.
              </p>
              <div className="flex justify-center">
                <DialogFooter>
                  <Button data-testid="return-home" href="/event-types" EndIcon={ArrowRightIcon}>
                    {t("go_back_home")}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    );
  }
  return null;
}

export async function getServerSideProps(context: NextPageContext) {
  const booking = await prisma.booking.findUnique({
    where: {
      uid: context.query.uid as string,
    },
    select: {
      uid: true,
      id: true,
      title: true,
      description: true,
      startTime: true,
      endTime: true,
      user: {
        select: {
          credentials: true,
        },
      },
      attendees: true,
      dailyRef: {
        select: {
          dailyurl: true,
          dailytoken: true,
        },
      },
      references: {
        select: {
          uid: true,
          type: true,
        },
      },
    },
  });

  if (!booking) {
    // TODO: Booking is already cancelled
    return {
      props: { booking: null },
    };
  }

  const bookingObj = Object.assign({}, booking, {
    startTime: booking.startTime.toString(),
    endTime: booking.endTime.toString(),
  });
  const session = await getSession();

  return {
    props: {
      booking: bookingObj,
      session: session,
    },
  };
}
