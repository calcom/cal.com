import prisma from "@lib/prisma";
import { useSession } from "next-auth/client";
import Shell from "@components/Shell";
import { useRouter } from "next/router";
import dayjs from "dayjs";
import { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import { DotsHorizontalIcon } from "@heroicons/react/solid";
import classNames from "@lib/classNames";
import { ClockIcon, XIcon } from "@heroicons/react/outline";
import Loader from "@components/Loader";
import { getSession } from "@lib/auth";

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
      <Shell heading="Bookings" subtitle="See upcoming and past events booked through your event type links.">
        <div className="-mx-4 sm:mx-auto flex flex-col">
          <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
              <div className="border border-gray-200 overflow-hidden border-b rounded-sm">
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
                            <div className="text-sm text-neutral-900 font-medium  truncate max-w-60 md:max-w-96">
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
                          <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {dayjs(booking.startTime).format("D MMMM YYYY")}
                            </div>
                            <div className="text-sm text-gray-500">
                              {dayjs(booking.startTime).format("HH:mm")} -{" "}
                              {dayjs(booking.endTime).format("HH:mm")}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {!booking.confirmed && !booking.rejected && (
                              <>
                                <button
                                  onClick={() => confirmBookingHandler(booking, true)}
                                  className="text-xs sm:text-sm inline-flex items-center px-4 py-2 border-transparent font-medium rounded-sm shadow-sm text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black ml-2">
                                  Confirm
                                </button>
                                <button
                                  onClick={() => confirmBookingHandler(booking, false)}
                                  className="text-xs sm:text-sm inline-flex items-center px-4 py-2 border-transparent font-medium rounded-sm shadow-sm text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black ml-2">
                                  Reject
                                </button>
                              </>
                            )}
                            {booking.confirmed && !booking.rejected && (
                              <>
                                <a
                                  href={window.location.href + "/../cancel/" + booking.uid}
                                  className="hidden text-xs sm:text-sm lg:inline-flex items-center px-4 py-2 border-transparent font-medium rounded-sm shadow-sm text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black ml-2">
                                  <XIcon
                                    className="mr-3 h-5 w-5 text-neutral-400 group-hover:text-neutral-500"
                                    aria-hidden="true"
                                  />
                                  Cancel
                                </a>
                                <a
                                  href={window.location.href + "/../reschedule/" + booking.uid}
                                  className="hidden text-xs sm:text-sm lg:inline-flex items-center px-4 py-2 border-transparent font-medium rounded-sm shadow-sm text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black ml-2">
                                  <ClockIcon
                                    className="mr-3 h-5 w-5 text-neutral-400 group-hover:text-neutral-500"
                                    aria-hidden="true"
                                  />
                                  Reschedule
                                </a>
                                <Menu as="div" className="inline-block lg:hidden text-left ">
                                  {({ open }) => (
                                    <>
                                      <div>
                                        <Menu.Button className="text-neutral-400 mt-1 p-2 border border-transparent hover:border-gray-200">
                                          <span className="sr-only">Open options</span>
                                          <DotsHorizontalIcon className="h-5 w-5" aria-hidden="true" />
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
                                          className="origin-top-right absolute right-0 mt-2 w-56 rounded-sm shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none divide-y divide-neutral-100">
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
                                                    className="mr-3 h-5 w-5 text-neutral-400 group-hover:text-neutral-500"
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
                                                    "group flex items-center px-4 py-2 text-sm w-full font-medium"
                                                  )}>
                                                  <ClockIcon
                                                    className="mr-3 h-5 w-5 text-neutral-400 group-hover:text-neutral-500"
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
