import Head from "next/head";
import prisma from "../../lib/prisma";
import { CheckIcon } from "@heroicons/react/outline";
import Theme from "@components/Theme";
import { InferGetServerSidePropsType } from "next";

export default function Success(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { isReady } = Theme(props.user.theme);
  const location = props.booking.location;
  const eventName = props.booking.title;

  return (
    isReady && (
      <div className="h-screen bg-neutral-50">
        <Head>
          <title>Async Meeting Confirmed | Calendso</title>
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <main className="max-w-3xl py-24 mx-auto">
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 my-4 transition-opacity sm:my-0" aria-hidden="true">
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                  &#8203;
                </span>
                <div
                  className="inline-block px-8 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white border rounded-sm border-neutral-200 sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:py-6"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="modal-headline">
                  <div>
                    <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 rounded-full">
                      <CheckIcon className="w-8 h-8 text-green-600" />
                    </div>
                    <div className="mt-3 text-center sm:mt-5">
                      <h3 className="text-2xl font-semibold leading-6 text-neutral-900" id="modal-headline">
                        This meeting has been created
                      </h3>
                      <div className="mt-3">
                        <p className="text-sm text-neutral-600 ">
                          A Yac Channel has been created for this meeting.
                        </p>
                      </div>
                      <div className="grid grid-cols-3 py-4 mt-4 text-left text-gray-700 border-t">
                        <div className="font-medium">What</div>
                        <div className="col-span-2 mb-6">{eventName}</div>
                        {location && (
                          <>
                            <div className="font-medium">Where</div>
                            <div className="col-span-2">
                              <a href={location} className="text-black hover:opacity-90">
                                {location}
                              </a>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {!props.user.hideBranding && (
                    <div className="pt-4 mt-4 text-xs text-center text-gray-400 border-t ">
                      <a href="https://checkout.calendso.com">Create your own booking link with Calendso</a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  );
}

export async function getServerSideProps(context) {
  const bookingId = context.query.bookingId;
  const booking = await prisma.booking.findUnique({
    where: {
      id: Number(bookingId),
    },
    select: {
      location: true,
      title: true,
      userId: true,
    },
  });
  if (!booking || !booking.userId) {
    return {
      notFound: true,
    };
  }
  const user = await prisma.user.findUnique({
    where: {
      id: booking.userId,
    },
    select: {
      username: true,
      name: true,
      bio: true,
      avatar: true,
      hideBranding: true,
      theme: true,
    },
  });
  console.log({ user, booking });
  if (!user) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      user,
      booking,
    },
  };
}
