import { BanIcon, CheckIcon, ClockIcon, XIcon } from "@heroicons/react/outline";
import { BookingStatus } from "@prisma/client";
import dayjs from "dayjs";
import { useMutation } from "react-query";

import { HttpError } from "@lib/core/http/error";
import { inferQueryOutput, trpc } from "@lib/trpc";

import TableActions, { ActionType } from "@components/ui/TableActions";

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

  const pendingActions: ActionType[] = [
    {
      id: "reject",
      label: "Reject",
      onClick: () => mutation.mutate(false),
      icon: BanIcon,
      disabled: mutation.isLoading,
    },
    {
      id: "confirm",
      label: "Confirm",
      onClick: () => mutation.mutate(true),
      icon: CheckIcon,
      disabled: mutation.isLoading,
      color: "primary",
    },
  ];

  const bookedActions: ActionType[] = [
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

  const startTime = dayjs(booking.startTime).format(isUpcoming ? "ddd, D MMM" : "D MMMM YYYY");

  return (
    <tr>
      <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{startTime}</div>
        <div className="text-sm text-gray-500">
          {dayjs(booking.startTime).format("HH:mm")} - {dayjs(booking.endTime).format("HH:mm")}
        </div>
        {!booking.confirmed && !booking.rejected && (
          <span className="mb-2 inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs font-medium bg-yellow-100 text-yellow-800">
            Unconfirmed
          </span>
        )}
      </td>
      <td className={"px-6 py-4" + (booking.rejected ? " line-through" : "")}>
        <div className="sm:hidden">
          {!booking.confirmed && !booking.rejected && (
            <span className="mb-2 inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs font-medium bg-yellow-100 text-yellow-800">
              Unconfirmed
            </span>
          )}
          <div className="text-sm text-gray-900 font-medium">
            {startTime}:{" "}
            <small className="text-sm text-gray-500">
              {dayjs(booking.startTime).format("HH:mm")} - {dayjs(booking.endTime).format("HH:mm")}
            </small>
          </div>
        </div>
        <div className="text-sm text-neutral-900 font-medium  truncate max-w-60 md:max-w-96">
          {booking.eventType?.team && <strong>{booking.eventType.team.name}: </strong>}
          {booking.title}
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

export default BookingListItem;
