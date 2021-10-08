import { CalendarIcon, XIcon } from "@heroicons/react/outline";
import { ArrowRightIcon } from "@heroicons/react/solid";
import dayjs from "dayjs";
import { getSession } from "next-auth/client";
import { useRouter } from "next/router";
import { useState } from "react";
import { useEffect } from "react";

import prisma from "@lib/prisma";

import { HeadSeo } from "@components/seo/head-seo";
import Button from "@components/ui/Button";

export default function MeetingUnavailable(props) {
  const router = useRouter();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [is24h, setIs24h] = useState(false);

  //if no booking redirectis to the 404 page
  const emptyBooking = props.booking === null;
  useEffect(() => {
    if (emptyBooking) {
      router.push("/call/no-meeting-found");
    }
  });
  if (!emptyBooking) {
    return (
      <div>
        <HeadSeo title={`Meeting Unavaialble`} description={`Meeting Unavailable`} />
        <main className="max-w-3xl mx-auto my-24">
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 my-4 transition-opacity sm:my-0" aria-hidden="true">
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                  &#8203;
                </span>
                <div
                  className="inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-sm sm:w-full sm:p-6"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="modal-headline">
                  <div>
                    <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                      <XIcon className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="mt-3 text-center sm:mt-5">
                      <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-headline">
                        This meeting is in the past.
                      </h3>
                    </div>
                    <div className="py-4 mt-4 border-t border-b">
                      <h2 className="mb-2 text-lg font-medium text-center text-gray-600 font-cal">
                        {props.booking.title}
                      </h2>
                      <p className="text-center text-gray-500">
                        <CalendarIcon className="inline-block w-4 h-4 mr-1 -mt-1" />
                        {dayjs(props.booking.startTime).format(
                          (is24h ? "H:mm" : "h:mma") + ", dddd DD MMMM YYYY"
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 text-center sm:mt-6">
                    <div className="mt-5">
                      <Button data-testid="return-home" href="/event-types" EndIcon={ArrowRightIcon}>
                        Go back home
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
  return null;
}

export async function getServerSideProps(context) {
  const booking = await prisma.booking.findUnique({
    where: {
      uid: context.query.uid,
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
