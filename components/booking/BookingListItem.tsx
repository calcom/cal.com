import { BanIcon, CheckIcon, ClockIcon, XIcon } from "@heroicons/react/outline";
import { BookingStatus } from "@prisma/client";
import dayjs from "dayjs";
import { useMutation } from "react-query";

import { HttpError } from "@lib/core/http/error";
import { useLocale } from "@lib/hooks/useLocale";
import { inferQueryOutput, trpc } from "@lib/trpc";

import TableActions, { ActionType } from "@components/ui/TableActions";

type BookingItem = inferQueryOutput<"viewer.bookings">[number];

function BookingListItem(booking: BookingItem) {
  const { t, i18n } = useLocale();
  const utils = trpc.useContext();

  const mutation = useMutation(
    async (confirm: boolean) => {
      const res = await fetch("/api/book/confirm", {
        method: "PATCH",
        body: JSON.stringify({ id: booking.id, confirmed: confirm, language: i18n.language }),
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
        await utils.invalidateQueries(["viewer.bookings"]);
      },
    }
  );
  const isUpcoming = new Date(booking.endTime) >= new Date();
  const isCancelled = booking.status === BookingStatus.CANCELLED;

  const pendingActions: ActionType[] = [
    {
      id: "reject",
      label: t("reject"),
      onClick: () => mutation.mutate(false),
      icon: BanIcon,
      disabled: mutation.isLoading,
    },
    {
      id: "confirm",
      label: t("confirm"),
      onClick: () => mutation.mutate(true),
      icon: CheckIcon,
      disabled: mutation.isLoading,
      color: "primary",
    },
  ];

  const bookedActions: ActionType[] = [
    {
      id: "cancel",
      label: t("cancel"),
      href: `/cancel/${booking.uid}`,
      icon: XIcon,
    },
    {
      id: "reschedule",
      label: t("reschedule"),
      href: `/reschedule/${booking.uid}`,
      icon: ClockIcon,
    },
  ];

  const startTime = dayjs(booking.startTime).format(isUpcoming ? "ddd, D MMM" : "D MMMM YYYY");

  return (
    <tr>
      <td className="hidden px-6 py-4 align-top sm:table-cell whitespace-nowrap">
        <div className="text-sm leading-6 text-gray-900">{startTime}</div>
        <div className="text-sm text-gray-500">
          {dayjs(booking.startTime).format("HH:mm")} - {dayjs(booking.endTime).format("HH:mm")}
        </div>
      </td>
      <td className={"px-6 py-4" + (booking.rejected ? " line-through" : "")}>
        <div className="sm:hidden">
          {!booking.confirmed && !booking.rejected && (
            <span className="mb-2 inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs font-medium bg-yellow-100 text-yellow-800">
              {t("unconfirmed")}
            </span>
          )}
          <div className="text-sm font-medium text-gray-900">
            {startTime}:{" "}
            <small className="text-sm text-gray-500">
              {dayjs(booking.startTime).format("HH:mm")} - {dayjs(booking.endTime).format("HH:mm")}
            </small>
          </div>
        </div>
        <div className="text-sm font-medium leading-6 truncate text-neutral-900 max-w-52 md:max-w-96">
          {booking.eventType?.team && <strong>{booking.eventType.team.name}: </strong>}
          {booking.title}
          {!booking.confirmed && !booking.rejected && (
            <span className="ml-2 hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs font-medium bg-yellow-100 text-yellow-800">
              {t("unconfirmed")}
            </span>
          )}
        </div>
        {booking.description && (
          <div className="text-sm text-gray-500 truncate max-w-52 md:max-w-96" title={booking.description}>
            &quot;{booking.description}&quot;
          </div>
        )}
        {booking.attendees.length !== 0 && (
          <div className="text-sm text-gray-900 hover:text-blue-500">
            <a href={"mailto:" + booking.attendees[0].email}>{booking.attendees[0].email}</a>
          </div>
        )}
      </td>

      <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
        {isUpcoming && !isCancelled ? (
          <>
            {!booking.confirmed && !booking.rejected && <TableActions actions={pendingActions} />}
            {booking.confirmed && !booking.rejected && <TableActions actions={bookedActions} />}
            {!booking.confirmed && booking.rejected && (
              <div className="text-sm text-gray-500">{t("rejected")}</div>
            )}
          </>
        ) : null}
      </td>
    </tr>
  );
}

export default BookingListItem;
