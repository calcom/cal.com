import { BanIcon, CheckIcon, ClockIcon, XIcon } from "@heroicons/react/outline";
import { BookingStatus } from "@prisma/client";
import dayjs from "dayjs";
import { useState } from "react";
import { useMutation } from "react-query";

import { HttpError } from "@lib/core/http/error";
import { useLocale } from "@lib/hooks/useLocale";
import { inferQueryOutput, trpc } from "@lib/trpc";

import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@components/Dialog";
import { TextArea } from "@components/form/fields";
import Button from "@components/ui/Button";
import TableActions, { ActionType } from "@components/ui/TableActions";

type BookingItem = inferQueryOutput<"viewer.bookings">["bookings"][number];

function BookingListItem(booking: BookingItem) {
  const { t, i18n } = useLocale();
  const utils = trpc.useContext();
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [rejectionDialogIsOpen, setRejectionDialogIsOpen] = useState(false);
  const mutation = useMutation(
    async (confirm: boolean) => {
      const res = await fetch("/api/book/confirm", {
        method: "PATCH",
        body: JSON.stringify({
          id: booking.id,
          confirmed: confirm,
          language: i18n.language,
          reason: rejectionReason,
        }),
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
      onClick: () => setRejectionDialogIsOpen(true),
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
    <>
      <Dialog open={rejectionDialogIsOpen} onOpenChange={setRejectionDialogIsOpen}>
        <DialogContent>
          <DialogHeader title={t("rejection_reason_title")} />

          <p className="-mt-4 text-sm text-gray-500">{t("rejection_reason_description")}</p>
          <p className="mt-6 mb-2 text-sm font-bold text-black">
            {t("rejection_reason")}
            <span className="font-normal text-gray-500"> (Optional)</span>
          </p>
          <TextArea
            name={t("rejection_reason")}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="mb-5 sm:mb-6"
          />

          <DialogFooter>
            <DialogClose>
              <Button color="secondary">{t("cancel")}</Button>
            </DialogClose>

            <Button
              disabled={mutation.isLoading}
              onClick={() => {
                mutation.mutate(false);
              }}>
              {t("rejection_confirmation")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <tr className="flex">
        <td className="hidden whitespace-nowrap py-4 align-top ltr:pl-6 rtl:pr-6 sm:table-cell">
          <div className="text-sm leading-6 text-gray-900">{startTime}</div>
          <div className="text-sm text-gray-500">
            {dayjs(booking.startTime).format("HH:mm")} - {dayjs(booking.endTime).format("HH:mm")}
          </div>
        </td>
        <td className={"flex-1 py-4 ltr:pl-4 rtl:pr-4" + (booking.rejected ? " line-through" : "")}>
          <div className="sm:hidden">
            {!booking.confirmed && !booking.rejected && (
              <Tag className="mb-2 ltr:mr-2 rtl:ml-2">{t("unconfirmed")}</Tag>
            )}
            {!!booking?.eventType?.price && !booking.paid && (
              <Tag className="mb-2 ltr:mr-2 rtl:ml-2">Pending payment</Tag>
            )}
            <div className="text-sm font-medium text-gray-900">
              {startTime}:{" "}
              <small className="text-sm text-gray-500">
                {dayjs(booking.startTime).format("HH:mm")} - {dayjs(booking.endTime).format("HH:mm")}
              </small>
            </div>
          </div>
          <div
            title={booking.title}
            className="max-w-56 truncate text-sm font-medium leading-6 text-neutral-900 md:max-w-max">
            {booking.eventType?.team && <strong>{booking.eventType.team.name}: </strong>}
            {booking.title}
            {!!booking?.eventType?.price && !booking.paid && (
              <Tag className="hidden ltr:ml-2 rtl:mr-2 sm:inline-flex">Pending payment</Tag>
            )}
            {!booking.confirmed && !booking.rejected && (
              <Tag className="hidden ltr:ml-2 rtl:mr-2 sm:inline-flex">{t("unconfirmed")}</Tag>
            )}
          </div>
          {booking.description && (
            <div className="max-w-52 md:max-w-96 truncate text-sm text-gray-500" title={booking.description}>
              &quot;{booking.description}&quot;
            </div>
          )}
          {booking.attendees.length !== 0 && (
            <div className="text-sm text-gray-900 hover:text-blue-500">
              <a href={"mailto:" + booking.attendees[0].email}>{booking.attendees[0].email}</a>
            </div>
          )}
        </td>

        <td className="whitespace-nowrap py-4 text-right text-sm font-medium ltr:pr-4 rtl:pl-4">
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
    </>
  );
}

const Tag = ({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) => {
  return (
    <span
      className={`inline-flex items-center rounded-sm bg-yellow-100 px-1.5 py-0.5 text-xs font-medium text-yellow-800 ${className}`}>
      {children}
    </span>
  );
};

export default BookingListItem;
