// TODO: replace headlessui with radix-ui
import { BanIcon, CalendarIcon, CheckIcon, ClockIcon, XIcon } from "@heroicons/react/outline";
import { BookingStatus } from "@prisma/client";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import { useMutation } from "react-query";

import { HttpError } from "@lib/core/http/error";
import { inferQueryOutput, trpc } from "@lib/trpc";

import BookingsShell from "@components/BookingsShell";
import EmptyScreen from "@components/EmptyScreen";
import Loader from "@components/Loader";
import Shell from "@components/Shell";
import { Alert } from "@components/ui/Alert";
import TableActions from "@components/ui/TableActions";

type BookingItem = inferQueryOutput<"viewer.bookings">[number];

function BookingListItem(booking: BookingItem) {
  const utils = trpc.useContext();
  const mutation = useMutation(
    async (confirm: boolean) => {
      const res = await fetch("/api/book/confirm", {
        method: "PATCH",
        body: JSON.stringify({ id: booking.id, confirmed: confirm }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        throw new HttpError({ statusCode: res.status });
      }
    },
    {
      async onSettled() {
        await utils.invalidateQuery(["viewer.bookings"]);
      },
    }
  );
  const isUpcoming = new Date(booking.endTime) >= new Date();
  const isCancelled = booking.status === BookingStatus.CANCELLED;

  const pendingActions = [
    {
      id: "confirm",
      label: "Confirm",
      onClick: () => mutation.mutate(true),
      icon: CheckIcon,
      disabled: mutation.isLoading,
    },
    {
      id: "reject",
      label: "Reject",
      onClick: () => mutation.mutate(false),
      icon: BanIcon,
      disabled: mutation.isLoading,
    },
  ];

  const bookedActions = [
    {
      id: "cancel",
      label: "Cancel",
      href: `/cancel/${booking.uid}`,
      icon: XIcon,
    },
    {
      id: "reschedule",
      label: "Reschedule",
      href: `/reschedule/${booking.uid}`,
      icon: ClockIcon,
    },
  ];

  return (
    <tr>
      <td className={"px-6 py-4" + (booking.rejected ? " line-through" : "")}>
        {!booking.confirmed && !booking.rejected && (
          <span className="mb-2 inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs font-medium bg-yellow-100 text-yellow-800">
            Unconfirmed
          </span>
        )}
        <div className="text-sm text-neutral-900 font-medium  truncate max-w-60 md:max-w-96">
          {booking.eventType?.team && <strong>{booking.eventType.team.name}: </strong>}
          {booking.title}
        </div>
        <div className="sm:hidden">
          <div className="text-sm text-gray-900">
            {dayjs(booking.startTime).format("D MMMM YYYY")}:{" "}
            <small className="text-sm text-gray-500">
              {dayjs(booking.startTime).format("HH:mm")} - {dayjs(booking.endTime).format("HH:mm")}
            </small>
          </div>
        </div>
        {booking.description && (
          <div className="text-sm text-neutral-600 truncate max-w-60 md:max-w-96">
            &quot;{booking.description}&quot;
          </div>
        )}
        {booking.attendees.length !== 0 && (
          <div className="text-sm text-blue-500">
            <a href={"mailto:" + booking.attendees[0].email}>{booking.attendees[0].email}</a>
          </div>
        )}
      </td>
      <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{dayjs(booking.startTime).format("D MMMM YYYY")}</div>
        <div className="text-sm text-gray-500">
          {dayjs(booking.startTime).format("HH:mm")} - {dayjs(booking.endTime).format("HH:mm")}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        {isUpcoming && !isCancelled ? (
          <>
            {!booking.confirmed && !booking.rejected && <TableActions actions={pendingActions} />}
            {booking.confirmed && !booking.rejected && <TableActions actions={bookedActions} />}
            {!booking.confirmed && booking.rejected && <div className="text-sm text-gray-500">Rejected</div>}
          </>
        ) : null}
      </td>
    </tr>
  );
}

export default function Bookings() {
  const router = useRouter();
  const query = trpc.useQuery(["viewer.bookings"]);
  const filtersByStatus = {
    upcoming: (booking: BookingItem) =>
      new Date(booking.endTime) >= new Date() && booking.status !== BookingStatus.CANCELLED,
    past: (booking: BookingItem) => new Date(booking.endTime) < new Date(),
    cancelled: (booking: BookingItem) => booking.status === BookingStatus.CANCELLED,
  } as const;
  const filterKey = (router.query?.status as string as keyof typeof filtersByStatus) || "upcoming";
  const appliedFilter = filtersByStatus[filterKey];
  const bookings = query.data?.filter(appliedFilter);

  return (
    <Shell heading="Bookings" subtitle="See upcoming and past events booked through your event type links.">
      <BookingsShell>
        <div className="-mx-4 sm:mx-auto flex flex-col">
          <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
              {query.status === "error" && (
                <Alert severity="error" title="Something went wrong" message={query.error.message} />
              )}
              {query.status === "loading" && <Loader />}
              {bookings &&
                (bookings.length === 0 ? (
                  <EmptyScreen
                    Icon={CalendarIcon}
                    headline="No upcoming bookings, yet"
                    description="You have no upcoming bookings. As soon as someone books a time with you it will show up here."
                  />
                ) : (
                  <div className="my-6 border border-gray-200 overflow-hidden border-b rounded-sm">
                    <table className="min-w-full divide-y divide-gray-200">
                      <tbody className="bg-white divide-y divide-gray-200" data-testid="bookings">
                        {bookings.map((booking) => (
                          <BookingListItem key={booking.id} {...booking} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </BookingsShell>
    </Shell>
  );
}
