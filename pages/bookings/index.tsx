import Head from "next/head";
import prisma from "../../lib/prisma";
import { getSession, useSession } from "next-auth/client";
import Shell from "../../components/Shell";
import { useRouter } from "next/router";
import dayjs from "dayjs";


export default function Bookings({ bookings }) {
  const [, loading] = useSession();
  const router = useRouter();

  if (loading) {
    return <p className="text-gray-400">Loading...</p>;
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
        <div className="-mx-4 sm:mx-auto flex flex-col">
          <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
              <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Person
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Event
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bookings
                      .filter((booking) => !booking.confirmed && !booking.rejected)
                      .concat(bookings.filter((booking) => booking.confirmed || booking.rejected))
                      .map((booking) => (
                        <tr key={booking.id}>
                          <td className={"px-6 py-4" + (booking.rejected ? " line-through" : "")}>
                            {!booking.confirmed && !booking.rejected && (
                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs font-medium bg-yellow-100 text-yellow-800">
                                Unconfirmed
                              </span>
                            )}
                            <div className="text-sm font-medium text-gray-900">
                              {booking.attendees[0].name}
                            </div>
                            <div className="text-sm text-gray-500">{booking.attendees[0].email}</div>
                            <div
                              style={{ maxWidth: 150 }}
                              className="block lg:hidden font-medium text-xs text-gray-900 truncate">
                              {booking.title}
                            </div>
                          </td>
                          <td
                            className={
                              "px-6 py-4 max-w-20 w-full" + (booking.rejected ? " line-through" : "")
                            }>
                            <div className="hidden lg:block text-sm text-neutral-900 font-medium">
                              {booking.title}
                            </div>
                            <div className="hidden lg:block text-sm text-neutral-500">
                              You and {booking.attendees[0].name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {dayjs(booking.startTime).format("D MMMM YYYY")}
                            </div>
                            <div className="text-sm text-gray-500">
                              {dayjs(booking.startTime).format("HH:mm")} - {dayjs(booking.endTime).format("HH:mm")}
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
                                  className="text-xs sm:text-sm ml-4 inline-flex items-center px-4 py-2 border-transparent font-medium rounded-sm shadow-sm text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black ml-2">
                                  Reject
                                </button>
                              </>
                            )}
                            {booking.confirmed && !booking.rejected && (
                              <>
                                <a
                                  href={window.location.href + "/../cancel/" + booking.uid}
                                  className="text-xs sm:text-sm inline-flex items-center px-4 py-2 border-transparent font-medium rounded-sm shadow-sm text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black ml-2">
                                  Cancel
                                </a>
                                <a
                                  href={window.location.href + "/../reschedule/" + booking.uid}
                                  className="text-xs sm:text-sm inline-flex items-center px-4 py-2 border-transparent font-medium rounded-sm shadow-sm text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black ml-2">
                                  Reschedule
                                </a>
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

  const bookings = b.map(booking=>{
    return ({...booking, startTime:booking.startTime.toISOString(), endTime:booking.endTime.toISOString(),})
  });

  return { props: { bookings } };
}
