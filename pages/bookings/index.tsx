import Head from "next/head";
import prisma from "../../lib/prisma";
import { getSession, useSession } from "next-auth/client";
import Shell from "../../components/Shell";
import { useRouter } from "next/router";
import dayjs from "dayjs";
import { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import { DotsHorizontalIcon } from "@heroicons/react/solid";
import classNames from "@lib/classNames";
import { ClockIcon, XIcon } from "@heroicons/react/outline";
import Loader from "@components/Loader";

export default function Bookings({ bookings }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [session, loading] = useSession();

  const router = useRouter();

  if (loading) {
    return <Loader />;
  }

  async function confirmBookingHandler(booking, confirm: boolean) {
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
            <div className="inline-block align-middle py-2 min-w-full sm:px-6 lg:px-8">
              <div className="border border-b border-gray-200 rounded-sm overflow-hidden">
                <table className="min-w-full divide-gray-200 divide-y">
                  <tbody className="bg-white divide-gray-200 divide-y">
                    {bookings
                      .filter((booking) => !booking.confirmed && !booking.rejected)
                      .concat(bookings.filter((booking) => booking.confirmed || booking.rejected))
                      .map((booking) => (
                        <tr key={booking.id}>
                          <td className={"px-6 py-4" + (booking.rejected ? " line-through" : "")}>
                            {!booking.confirmed && !booking.rejected && (
                              <span className="inline-flex items-center mb-2 px-1.5 py-0.5 text-yellow-800 text-xs font-medium bg-yellow-100 rounded-sm">
                                Unconfirmed
                              </span>
                            )}
                            <div className="max-w-60 text-neutral-900 text-sm font-medium truncate md:max-w-96">
                              {booking.title}
                            </div>
                            <div className="sm:hidden">
                              <div className="text-gray-900 text-sm">
                                {dayjs(booking.startTime).format("D MMMM YYYY")}:{" "}
                                <small className="text-gray-500 text-sm">
                                  {dayjs(booking.startTime).format("HH:mm")} -{" "}
                                  {dayjs(booking.endTime).format("HH:mm")}
                                </small>
                              </div>
                            </div>
                            <div className="text-blue-500 text-sm">
                              <a href={"mailto:" + booking.attendees[0].email}>
                                {booking.attendees[0].email}
                              </a>
                            </div>
                          </td>
                          <td className="hidden px-6 py-4 whitespace-nowrap sm:table-cell">
                            <div className="text-gray-900 text-sm">
                              {dayjs(booking.startTime).format("D MMMM YYYY")}
                            </div>
                            <div className="text-gray-500 text-sm">
                              {dayjs(booking.startTime).format("HH:mm")} -{" "}
                              {dayjs(booking.endTime).format("HH:mm")}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap text-sm font-medium">
                            {!booking.confirmed && !booking.rejected && (
                              <>
                                <button
                                  onClick={() => confirmBookingHandler(booking, true)}
                                  className="inline-flex items-center ml-2 px-4 py-2 text-neutral-700 text-xs font-medium hover:bg-neutral-100 bg-white border border-neutral-300 border-transparent rounded-sm focus:outline-none shadow-sm focus:ring-2 focus:ring-black focus:ring-offset-2 sm:text-sm">
                                  Confirm
                                </button>
                                <button
                                  onClick={() => confirmBookingHandler(booking, false)}
                                  className="inline-flex items-center ml-2 px-4 py-2 text-neutral-700 text-xs font-medium hover:bg-neutral-100 bg-white border border-neutral-300 border-transparent rounded-sm focus:outline-none shadow-sm focus:ring-2 focus:ring-black focus:ring-offset-2 sm:text-sm">
                                  Reject
                                </button>
                              </>
                            )}
                            {booking.confirmed && !booking.rejected && (
                              <>
                                <a
                                  href={window.location.href + "/../cancel/" + booking.uid}
                                  className="hidden items-center ml-2 px-4 py-2 text-neutral-700 text-xs font-medium hover:bg-neutral-100 bg-white border border-neutral-300 border-transparent rounded-sm focus:outline-none shadow-sm focus:ring-2 focus:ring-black focus:ring-offset-2 sm:text-sm lg:inline-flex">
                                  <XIcon
                                    className="mr-3 w-5 h-5 text-neutral-400 group-hover:text-neutral-500"
                                    aria-hidden="true"
                                  />
                                  Cancel
                                </a>
                                <a
                                  href={window.location.href + "/../reschedule/" + booking.uid}
                                  className="hidden items-center ml-2 px-4 py-2 text-neutral-700 text-xs font-medium hover:bg-neutral-100 bg-white border border-neutral-300 border-transparent rounded-sm focus:outline-none shadow-sm focus:ring-2 focus:ring-black focus:ring-offset-2 sm:text-sm lg:inline-flex">
                                  <ClockIcon
                                    className="mr-3 w-5 h-5 text-neutral-400 group-hover:text-neutral-500"
                                    aria-hidden="true"
                                  />
                                  Reschedule
                                </a>
                                <Menu as="div" className="inline-block text-left lg:hidden">
                                  {({ open }) => (
                                    <>
                                      <div>
                                        <Menu.Button className="mt-1 p-2 text-neutral-400 border hover:border-gray-200 border-transparent">
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
                                          className="absolute right-0 mt-2 w-56 bg-white rounded-sm focus:outline-none shadow-lg divide-neutral-100 divide-y origin-top-right ring-1 ring-black ring-opacity-5">
                                          <div className="py-1">
                                            <Menu.Item>
                                              {({ active }) => (
                                                <a
                                                  href={window.location.href + "/../cancel/" + booking.uid}
                                                  className={classNames(
                                                    active
                                                      ? "bg-neutral-100 text-neutral-900"
                                                      : "text-neutral-700",
                                                    "group flex items-center px-4 py-2 text-sm font-medium"
                                                  )}>
                                                  <XIcon
                                                    className="mr-3 w-5 h-5 text-neutral-400 group-hover:text-neutral-500"
                                                    aria-hidden="true"
                                                  />
                                                  Cancel
                                                </a>
                                              )}
                                            </Menu.Item>
                                            <Menu.Item>
                                              {({ active }) => (
                                                <a
                                                  href={
                                                    window.location.href + "/../reschedule/" + booking.uid
                                                  }
                                                  className={classNames(
                                                    active
                                                      ? "bg-neutral-100 text-neutral-900"
                                                      : "text-neutral-700",
                                                    "group flex items-center px-4 py-2 w-full text-sm font-medium"
                                                  )}>
                                                  <ClockIcon
                                                    className="mr-3 w-5 h-5 text-neutral-400 group-hover:text-neutral-500"
                                                    aria-hidden="true"
                                                  />
                                                  Reschedule
                                                </a>
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
                              <div className="text-gray-500 text-sm">Rejected</div>
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

export async function getServerSideProps(context) {
  const session = await getSession(context);

  if (!session) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  const user = await prisma.user.findFirst({
    where: {
      email: session.user.email,
    },
    select: {
      id: true,
    },
  });

  const b = await prisma.booking.findMany({
    where: {
      userId: user.id,
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
}
