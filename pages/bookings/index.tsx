import Head from "next/head";
import prisma from "../../lib/prisma";
import { getSession, useSession } from "next-auth/client";
import Shell from "../../components/Shell";
import { useRouter } from "next/router";

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
        <div className="flex flex-col">
          <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
              <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bookings
                      .filter((booking) => !booking.confirmed && !booking.rejected)
                      .concat(bookings.filter((booking) => booking.confirmed || booking.rejected))
                      .map((booking) => (
                        <tr key={booking.id}>
                          <td
                            className={
                              "px-6 py-4 whitespace-nowrap" + (booking.rejected ? " line-through" : "")
                            }>
                            {!booking.confirmed && !booking.rejected && (
                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs font-medium bg-yellow-100 text-yellow-800">
                                Unconfirmed
                              </span>
                            )}
                            <div className="text-sm font-medium text-gray-900">
                              {booking.attendees[0].name}
                            </div>
                            <div className="text-sm text-gray-500">{booking.attendees[0].email}</div>
                          </td>
                          <td
                            className={
                              "px-6 py-4 max-w-20 w-full" + (booking.rejected ? " line-through" : "")
                            }>
                            <div className="text-sm text-neutral-900 font-medium">{booking.title}</div>
                            <div className="text-sm text-neutral-500">
                              You and {booking.attendees[0].name}
                            </div>
                          </td>
                          {/* <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {dayjs(booking.startTime).format("D MMMM YYYY HH:mm")}
                          </div>
                        </td> */}
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {!booking.confirmed && !booking.rejected && (
                              <>
                                <a
                                  onClick={() => confirmBookingHandler(booking, true)}
                                  className="cursor-pointer text-blue-600 hover:text-blue-900">
                                  Confirm
                                </a>
                                <a
                                  onClick={() => confirmBookingHandler(booking, false)}
                                  className="cursor-pointer ml-4 text-blue-600 hover:text-blue-900">
                                  Reject
                                </a>
                              </>
                            )}
                            {booking.confirmed && !booking.rejected && (
                              <>
                                <a
                                  href={window.location.href + "/../cancel/" + booking.uid}
                                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-sm shadow-sm text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black mr-2">
                                  Cancel
                                </a>
                                <a
                                  href={window.location.href + "/../reschedule/" + booking.uid}
                                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-sm shadow-sm text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black mr-2">
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

  const bookings = await prisma.booking.findMany({
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
    },
    orderBy: {
      startTime: "desc",
    },
  });

  return { props: { bookings } };
}
