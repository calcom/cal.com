import Loader from "@components/Loader";
import Shell from "@components/Shell";
import { Menu, Transition } from "@headlessui/react";
import { ClockIcon, XIcon } from "@heroicons/react/outline";
import { DotsHorizontalIcon } from "@heroicons/react/solid";
import classNames from "@lib/classNames";
import prisma from "@lib/prisma";
import dayjs from "dayjs";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import { getSession, useSession } from "next-auth/client";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { Fragment } from "react";

export default function Bookings({ bookings }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [session, loading] = useSession();

  const router = useRouter();

  if (loading) {
    return <Loader />;
  }

  async function confirmBookingHandler(booking: typeof bookings[number], confirm: boolean) {
    const res = await fetch("/api/book/confirm", {
      method: "PATCH",
      body: JSON.stringify({ id: booking.id, confirmed: confirm }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (res.ok) {
      await router.replace(router.asPath);
    }
  }

  return (
    <div>
      <Head>
        <title>Bookings | Calendso</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Shell heading="Bookings" subtitle="See upcoming and past events booked through your event type links.">
        <div className="flex flex-col -mx-4 sm:mx-auto">
          <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <div className="overflow-hidden border border-b border-gray-200 rounded-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bookings
                      .filter((booking) => !booking.confirmed && !booking.rejected)
                      .concat(bookings.filter((booking) => booking.confirmed || booking.rejected))
                      .map((booking) => (
                        <tr key={booking.id}>
                          <td className={"px-6 py-4" + (booking.rejected ? " line-through" : "")}>
                            {!booking.confirmed && !booking.rejected && (
                              <span className="mb-2 inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs font-medium bg-yellow-100 text-yellow-800">
                                Unconfirmed
                              </span>
                            )}
                            <div className="text-sm font-medium truncate text-neutral-900 max-w-60 md:max-w-96">
                              {booking.title}
                            </div>
                            <div className="sm:hidden">
                              <div className="text-sm text-gray-900">
                                {dayjs(booking.startTime).format("D MMMM YYYY")}:{" "}
                                <small className="text-sm text-gray-500">
                                  {dayjs(booking.startTime).format("HH:mm")} -{" "}
                                  {dayjs(booking.endTime).format("HH:mm")}
                                </small>
                              </div>
                            </div>
                            <div className="text-sm text-blue-500">
                              <a href={"mailto:" + booking.attendees[0].email}>
                                {booking.attendees[0].email}
                              </a>
                            </div>
                          </td>
                          <td className="hidden px-6 py-4 sm:table-cell whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {dayjs(booking.startTime).format("D MMMM YYYY")}
                            </div>
                            <div className="text-sm text-gray-500">
                              {dayjs(booking.startTime).format("HH:mm")} -{" "}
                              {dayjs(booking.endTime).format("HH:mm")}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                            {!booking.confirmed && !booking.rejected && (
                              <>
                                <button
                                  onClick={() => confirmBookingHandler(booking, true)}
                                  className="inline-flex items-center px-4 py-2 ml-2 text-xs font-medium bg-white border border-transparent rounded-sm shadow-sm sm:text-sm text-neutral-700 hover:bg-neutral-100 border-neutral-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black">
                                  Confirm
                                </button>
                                <button
                                  onClick={() => confirmBookingHandler(booking, false)}
                                  className="inline-flex items-center px-4 py-2 ml-2 text-xs font-medium bg-white border border-transparent rounded-sm shadow-sm sm:text-sm text-neutral-700 hover:bg-neutral-100 border-neutral-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black">
                                  Reject
                                </button>
                              </>
                            )}
                            {booking.confirmed && !booking.rejected && (
                              <>
                                <Link href={`/cancel/${booking.uid}?from=/bookings`}>
                                  <a className="items-center hidden px-4 py-2 ml-2 text-xs font-medium bg-white border border-transparent rounded-sm shadow-sm sm:text-sm lg:inline-flex text-neutral-700 hover:bg-neutral-100 border-neutral-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black">
                                    <XIcon
                                      className="w-5 h-5 mr-3 text-neutral-400 group-hover:text-neutral-500"
                                      aria-hidden="true"
                                    />
                                    Cancel
                                  </a>
                                </Link>
                                <Link href={`/reschedule/${booking.uid}?from=/bookings`}>
                                  <a className="items-center hidden px-4 py-2 ml-2 text-xs font-medium bg-white border border-transparent rounded-sm shadow-sm sm:text-sm lg:inline-flex text-neutral-700 hover:bg-neutral-100 border-neutral-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black">
                                    <ClockIcon
                                      className="w-5 h-5 mr-3 text-neutral-400 group-hover:text-neutral-500"
                                      aria-hidden="true"
                                    />
                                    Reschedule
                                  </a>
                                </Link>
                                <Menu as="div" className="inline-block text-left lg:hidden ">
                                  {({ open }) => (
                                    <>
                                      <div>
                                        <Menu.Button className="p-2 mt-1 border border-transparent text-neutral-400 hover:border-gray-200">
                                          <span className="sr-only">Open options</span>
                                          <DotsHorizontalIcon className="w-5 h-5" aria-hidden="true" />
                                        </Menu.Button>
                                      </div>

                                      <Transition
                                        show={open}
                                        as={Fragment}
                                        enter="transition ease-out duration-100"
                                        enterFrom="transform opacity-0 scale-95"
                                        enterTo="transform opacity-100 scale-100"
                                        leave="transition ease-in duration-75"
                                        leaveFrom="transform opacity-100 scale-100"
                                        leaveTo="transform opacity-0 scale-95">
                                        <Menu.Items
                                          static
                                          className="absolute right-0 w-56 mt-2 origin-top-right bg-white divide-y rounded-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none divide-neutral-100">
                                          <div className="py-1">
                                            <Menu.Item>
                                              {({ active }) => (
                                                <Link href={`/cancel/${booking.uid}?from=/bookings`}>
                                                  <a
                                                    className={classNames(
                                                      active
                                                        ? "bg-neutral-100 text-neutral-900"
                                                        : "text-neutral-700",
                                                      "group flex items-center px-4 py-2 text-sm font-medium"
                                                    )}>
                                                    <XIcon
                                                      className="w-5 h-5 mr-3 text-neutral-400 group-hover:text-neutral-500"
                                                      aria-hidden="true"
                                                    />
                                                    Cancel
                                                  </a>
                                                </Link>
                                              )}
                                            </Menu.Item>
                                            <Menu.Item>
                                              {({ active }) => (
                                                <Link href={`/reschedule/${booking.uid}?from=/bookings`}>
                                                  <a
                                                    className={classNames(
                                                      active
                                                        ? "bg-neutral-100 text-neutral-900"
                                                        : "text-neutral-700",
                                                      "group flex items-center px-4 py-2 text-sm w-full font-medium"
                                                    )}>
                                                    <ClockIcon
                                                      className="w-5 h-5 mr-3 text-neutral-400 group-hover:text-neutral-500"
                                                      aria-hidden="true"
                                                    />
                                                    Reschedule
                                                  </a>
                                                </Link>
                                              )}
                                            </Menu.Item>
                                          </div>
                                        </Menu.Items>
                                      </Transition>
                                    </>
                                  )}
                                </Menu>
                              </>
                            )}
                            {!booking.confirmed && booking.rejected && (
                              <div className="text-sm text-gray-500">Rejected</div>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </Shell>
    </div>
  );
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const session = await getSession(context);

  if (!session) {
    /* IDK why but this prevents losing type inference: https://stackoverflow.com/a/59923262/6297100 */
    const redirectReturn = { redirect: { permanent: false, destination: "/auth/login" } } as const;
    return redirectReturn;
  }

  const user = await prisma.user.findFirst({
    where: {
      email: session.user?.email,
    },
    select: {
      id: true,
    },
  });

  const b = await prisma.booking.findMany({
    where: {
      userId: user?.id,
    },
    select: {
      uid: true,
      title: true,
      description: true,
      attendees: true,
      confirmed: true,
      rejected: true,
      id: true,
      startTime: true,
      endTime: true,
    },
    orderBy: {
      startTime: "asc",
    },
  });

  const bookings = b.reverse().map((booking) => {
    return { ...booking, startTime: booking.startTime.toISOString(), endTime: booking.endTime.toISOString() };
  });

  return { props: { bookings } };
};
