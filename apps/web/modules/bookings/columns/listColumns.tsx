import { createColumnHelper } from "@tanstack/react-table";

import dayjs from "@calcom/dayjs";
import { isSeparatorRow } from "@calcom/features/data-table/lib/separator";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { AvatarGroup } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";

import { JoinMeetingButton } from "../components/JoinMeetingButton";
import type { RowData } from "../types";

interface PendingActionHandlers {
  onAccept: (bookingId: number, recurringEventId?: string | null) => void;
  onReject: (bookingId: number, recurringEventId?: string | null) => void;
  isLoading?: boolean;
}

interface BuildListDisplayColumnsParams {
  t: (key: string) => string;
  user?: {
    timeZone?: string;
    timeFormat?: number | null;
  };
  onOpenDetails: (bookingId: number) => void;
  pendingActionHandlers: PendingActionHandlers;
}

export function buildListDisplayColumns({
  t,
  user,
  onOpenDetails,
  pendingActionHandlers,
}: BuildListDisplayColumnsParams) {
  const columnHelper = createColumnHelper<RowData>();

  return [
    columnHelper.display({
      id: "date",
      size: 140,
      enableColumnFilter: true,
      enableSorting: false,
      enableHiding: false,
      header: () => <span className="text-subtle text-sm font-medium">{t("date")}</span>,
      cell: (props) => {
        const row = props.row.original;
        if (isSeparatorRow(row)) return null;

        return (
          <div className="text-default text-sm font-medium">
            {dayjs(row.booking.startTime).tz(user?.timeZone).format("ddd, DD MMM")}
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "time",
      size: 140,
      enableColumnFilter: true,
      enableSorting: false,
      enableHiding: false,
      header: () => <span className="text-subtle text-sm font-medium">{t("time")}</span>,
      cell: (props) => {
        const row = props.row.original;
        if (isSeparatorRow(row)) return null;

        const startTime = dayjs(row.booking.startTime).tz(user?.timeZone);
        const endTime = dayjs(row.booking.endTime).tz(user?.timeZone);
        return (
          <div className="text-default text-sm font-medium">
            {startTime.format(user?.timeFormat === 12 ? "h:mma" : "HH:mm")} -{" "}
            {endTime.format(user?.timeFormat === 12 ? "h:mma" : "HH:mm")}
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "event",
      minSize: 200,
      enableColumnFilter: true,
      enableSorting: false,
      enableHiding: false,
      header: () => <span className="text-subtle text-sm font-medium">{t("event")}</span>,
      cell: (props) => {
        const row = props.row.original;
        if (isSeparatorRow(row)) return null;

        return (
          <div className="text-emphasis flex-1 truncate text-sm font-medium" data-testid="title">
            {row.booking.title}
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "who",
      size: 160,
      enableColumnFilter: true,
      enableSorting: false,
      enableHiding: false,
      header: () => <span className="text-subtle text-sm font-medium">{t("who")}</span>,
      cell: (props) => {
        const row = props.row.original;
        if (isSeparatorRow(row)) return null;

        const items = row.booking.attendees.map((attendee) => ({
          image: getPlaceholderAvatar(null, attendee.name),
          alt: attendee.name,
          title: attendee.name,
          href: null,
        }));

        return <AvatarGroup size="sm" truncateAfter={4} items={items} />;
      },
    }),
    columnHelper.display({
      id: "team",
      size: 140,
      enableColumnFilter: true,
      enableSorting: false,
      enableHiding: false,
      header: () => <span className="text-subtle text-sm font-medium">{t("team")}</span>,
      cell: (props) => {
        const row = props.row.original;
        if (isSeparatorRow(row)) return null;

        if (row.booking.eventType.team) {
          return (
            <Badge variant="gray" size="sm">
              {row.booking.eventType.team.name}
            </Badge>
          );
        }
        return null;
      },
    }),
    columnHelper.display({
      id: "actions",
      size: 280,
      enableColumnFilter: true,
      enableSorting: false,
      enableHiding: false,
      header: () => null,
      cell: (props) => {
        const row = props.row.original;
        if (isSeparatorRow(row)) return null;

        const booking = row.booking;
        const isPending = booking.status === "PENDING";
        const isUpcoming = new Date(booking.endTime) >= new Date();
        const isCancelled = booking.status === "CANCELLED";
        const isRejected = booking.status === "REJECTED";
        const isAccepted = booking.status === "ACCEPTED";

        // Determine if we should show pending actions
        const shouldShowPendingActions = isPending && isUpcoming && !isCancelled;

        // Determine which buttons to show based on payment status
        const hasPayment = Array.isArray(booking.payment) && booking.payment.length > 0;
        const isPaid = booking.paid;
        const shouldShowAccept = shouldShowPendingActions && (!hasPayment || isPaid);
        const shouldShowReject = shouldShowPendingActions;

        // Show join meeting button only for upcoming accepted/confirmed bookings
        const shouldShowJoinButton = isAccepted && isUpcoming && !isCancelled && !isRejected;

        // Determine if this is a recurring booking for the label
        const isRecurring = booking.recurringEventId !== null;
        const isTabRecurring = row.type === "data" && row.recurringInfo !== undefined;
        const isTabUnconfirmed = booking.status === "PENDING";
        const showAllLabel = (isTabRecurring || isTabUnconfirmed) && isRecurring;

        return (
          <div className="flex w-full items-center justify-end gap-2">
            {shouldShowReject && (
              <Button
                color="minimal"
                size="sm"
                StartIcon="ban"
                disabled={pendingActionHandlers.isLoading}
                data-testid="reject"
                onClick={(e) => {
                  e.stopPropagation();
                  const recurringEventId = showAllLabel ? booking.recurringEventId : null;
                  pendingActionHandlers.onReject(booking.id, recurringEventId);
                }}>
                {showAllLabel ? t("reject_all") : t("reject")}
              </Button>
            )}
            {shouldShowAccept && (
              <Button
                color="secondary"
                size="sm"
                StartIcon="check"
                disabled={pendingActionHandlers.isLoading}
                data-testid="confirm"
                onClick={(e) => {
                  e.stopPropagation();
                  const recurringEventId = showAllLabel ? booking.recurringEventId : null;
                  pendingActionHandlers.onAccept(booking.id, recurringEventId);
                }}>
                {showAllLabel ? t("confirm_all") : t("confirm")}
              </Button>
            )}
            {shouldShowJoinButton && (
              <JoinMeetingButton
                size="sm"
                location={booking.location}
                metadata={booking.metadata}
                bookingStatus={booking.status}
                t={t}
              />
            )}
            <Button
              size="sm"
              className="px-1.5"
              color="secondary"
              StartIcon="ellipsis"
              data-testid="booking-options"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails(row.booking.id);
              }}
            />
          </div>
        );
      },
    }),
  ];
}
