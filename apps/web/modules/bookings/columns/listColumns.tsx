import { createColumnHelper } from "@tanstack/react-table";
import { useState } from "react";

import dayjs from "@calcom/dayjs";
import { isSeparatorRow } from "@calcom/features/data-table/lib/separator";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import isSmsCalEmail from "@calcom/lib/isSmsCalEmail";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuPortal,
} from "@calcom/ui/components/dropdown";
import { showToast } from "@calcom/ui/components/toast";

import { BookingActionsDropdown } from "../../../components/booking/actions/BookingActionsDropdown";
import { BookingActionsStoreProvider } from "../../../components/booking/actions/BookingActionsStoreProvider";
import type { BookingListingStatus } from "../../../components/booking/types";
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
    id?: number;
    email?: string;
    timeZone?: string;
    timeFormat?: number | null;
  };
  pendingActionHandlers: PendingActionHandlers;
}

// Maximum number of attendees to display before showing "..." button
const MAX_DISPLAYED_ATTENDEES = 2;

type AttendeeProps = {
  name?: string;
  email: string;
  phoneNumber: string | null;
  id: number;
  noShow: boolean;
};

// Component for individual attendee avatar with dropdown
const IndividualAttendee = ({
  attendee,
  bookingUid,
  isBookingInPast,
}: {
  attendee: AttendeeProps;
  bookingUid: string;
  isBookingInPast: boolean;
}) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [openDropdown, setOpenDropdown] = useState(false);
  const { copyToClipboard, isCopied } = useCopy();

  const noShowMutation = trpc.viewer.loggedInViewerRouter.markNoShow.useMutation({
    onSuccess: async (data) => {
      showToast(data.message, "success");
      await utils.viewer.bookings.invalidate();
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  return (
    <Dropdown open={openDropdown} onOpenChange={setOpenDropdown}>
      <DropdownMenuTrigger asChild>
        <button className="focus:outline-none" data-testid="guest">
          <Avatar
            size="sm"
            imageSrc={getPlaceholderAvatar(null, attendee.name)}
            alt={attendee.name || attendee.email}
            title={attendee.name || attendee.email}
            className="border-subtle cursor-pointer hover:opacity-80"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent className="w-48" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuLabel className="text-emphasis px-3 py-2 text-sm font-medium">
            {attendee.name || attendee.email}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {!isSmsCalEmail(attendee.email) && (
            <DropdownMenuItem className="focus:outline-none">
              <DropdownItem
                StartIcon="mail"
                href={`mailto:${attendee.email}`}
                onClick={() => {
                  setOpenDropdown(false);
                }}>
                <a href={`mailto:${attendee.email}`}>{t("email")}</a>
              </DropdownItem>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem className="focus:outline-none">
            <DropdownItem
              StartIcon={isCopied ? "clipboard-check" : "clipboard"}
              onClick={(e) => {
                e.preventDefault();
                const smsCalEmail = isSmsCalEmail(attendee.email);
                copyToClipboard(smsCalEmail ? attendee.email : attendee.phoneNumber ?? "");
                setOpenDropdown(false);
                showToast(smsCalEmail ? t("email_copied") : t("phone_number_copied"), "success");
              }}>
              {!isCopied ? t("copy") : t("copied")}
            </DropdownItem>
          </DropdownMenuItem>

          {isBookingInPast && (
            <DropdownMenuItem className="focus:outline-none">
              <DropdownItem
                data-testid={attendee.noShow ? "unmark-no-show" : "mark-no-show"}
                onClick={(e) => {
                  e.preventDefault();
                  setOpenDropdown(false);
                  noShowMutation.mutate({
                    bookingUid,
                    attendees: [{ noShow: !attendee.noShow, email: attendee.email }],
                  });
                }}
                StartIcon={attendee.noShow ? "eye" : "eye-off"}>
                {attendee.noShow ? t("unmark_as_no_show") : t("mark_as_no_show")}
              </DropdownItem>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </Dropdown>
  );
};

// Component for the "..." dropdown that shows all attendees with action buttons
const AllAttendeesDropdown = ({
  attendees,
  bookingUid,
  isBookingInPast,
}: {
  attendees: AttendeeProps[];
  bookingUid: string;
  isBookingInPast: boolean;
}) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [openDropdown, setOpenDropdown] = useState(false);
  const { copyToClipboard } = useCopy();

  const noShowMutation = trpc.viewer.loggedInViewerRouter.markNoShow.useMutation({
    onSuccess: async (data) => {
      showToast(data.message, "success");
      await utils.viewer.bookings.invalidate();
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
    setOpenDropdown(false);
  };

  const handleCopy = (attendee: AttendeeProps) => {
    const isSmsAttendee = isSmsCalEmail(attendee.email);
    copyToClipboard(isSmsAttendee ? attendee.email : attendee.phoneNumber ?? "");
    showToast(isSmsAttendee ? t("email_copied") : t("phone_number_copied"), "success");
  };

  const handleToggleNoShow = (attendee: AttendeeProps) => {
    noShowMutation.mutate({
      bookingUid,
      attendees: [{ noShow: !attendee.noShow, email: attendee.email }],
    });
  };

  const handleMarkAllAsNoShow = () => {
    const allAttendees = attendees.map((attendee) => ({
      noShow: true,
      email: attendee.email,
    }));
    noShowMutation.mutate({
      bookingUid,
      attendees: allAttendees,
    });
    setOpenDropdown(false);
  };

  return (
    <Dropdown open={openDropdown} onOpenChange={setOpenDropdown}>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          color="minimal"
          StartIcon="ellipsis"
          className="px-1.5"
          data-testid="more-guests"
          onClick={(e) => {
            e.stopPropagation();
          }}></Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent className="w-80" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuLabel className="text-xs font-medium uppercase">{t("attendees")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="max-h-96 overflow-y-auto">
            {attendees.map((attendee) => (
              <div key={attendee.id} className="hover:bg-muted flex items-center justify-between px-2 py-2">
                <div className="flex-1 truncate text-sm">
                  <div className="font-medium">{attendee.name || attendee.email}</div>
                  {attendee.name && <div className="text-subtle text-xs">{attendee.email}</div>}
                </div>
                <div className="flex items-center gap-1">
                  {!isSmsCalEmail(attendee.email) && (
                    <Button
                      size="sm"
                      color="minimal"
                      StartIcon="mail"
                      className="px-1.5"
                      tooltip={t("email")}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEmail(attendee.email);
                      }}
                    />
                  )}
                  <Button
                    size="sm"
                    color="minimal"
                    StartIcon="clipboard"
                    className="px-1.5"
                    tooltip={t("copy")}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(attendee);
                    }}
                  />
                  {isBookingInPast && (
                    <Button
                      size="sm"
                      color="minimal"
                      StartIcon={attendee.noShow ? "eye" : "eye-off"}
                      className="px-1.5"
                      data-testid={attendee.noShow ? "unmark-no-show" : "mark-no-show"}
                      tooltip={attendee.noShow ? t("unmark_as_no_show") : t("mark_as_no_show")}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleNoShow(attendee);
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
          {isBookingInPast && (
            <>
              <DropdownMenuSeparator />
              <div className="flex justify-end p-2">
                <Button
                  size="sm"
                  color="secondary"
                  data-testid="update-no-show"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAllAsNoShow();
                  }}>
                  {t("mark_as_no_show_title")}
                </Button>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </Dropdown>
  );
};

// Component that renders the attendees with appropriate dropdown
const AttendeeCell = ({
  attendees,
  bookingUid,
  isBookingInPast,
}: {
  attendees: AttendeeProps[];
  bookingUid: string;
  isBookingInPast: boolean;
}) => {
  // Show "..." button if there are more attendees than the max display count
  const hasMoreThanMax = attendees.length > MAX_DISPLAYED_ATTENDEES;
  const displayedAttendees = attendees.slice(0, MAX_DISPLAYED_ATTENDEES);

  return (
    <div className="flex items-center">
      {displayedAttendees.map((attendee, idx) => (
        <div key={attendee.id} className={idx > 0 ? "-ml-1" : ""}>
          <IndividualAttendee attendee={attendee} bookingUid={bookingUid} isBookingInPast={isBookingInPast} />
        </div>
      ))}
      {hasMoreThanMax && (
        <AllAttendeesDropdown
          attendees={attendees}
          bookingUid={bookingUid}
          isBookingInPast={isBookingInPast}
        />
      )}
    </div>
  );
};

export function buildListDisplayColumns({ t, user, pendingActionHandlers }: BuildListDisplayColumnsParams) {
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

        const isBookingInPast = new Date(row.booking.endTime) < new Date();

        const attendees = row.booking.attendees.map((attendee) => ({
          name: attendee.name,
          email: attendee.email,
          id: attendee.id,
          noShow: attendee.noShow || false,
          phoneNumber: attendee.phoneNumber,
        }));

        return (
          <AttendeeCell
            attendees={attendees}
            bookingUid={row.booking.uid}
            isBookingInPast={isBookingInPast}
          />
        );
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
              />
            )}
            <BookingActionsStoreProvider>
              <BookingActionsDropdown
                booking={{
                  ...booking,
                  listingStatus: booking.status.toLowerCase() as BookingListingStatus,
                  recurringInfo: row.type === "data" ? row.recurringInfo : undefined,
                  loggedInUser: {
                    userId: user?.id,
                    userTimeZone: user?.timeZone,
                    userTimeFormat: user?.timeFormat,
                    userEmail: user?.email,
                  },
                  isToday: row.type === "data" ? row.isToday : false,
                }}
                className="px-1.5"
                size="sm"
              />
            </BookingActionsStoreProvider>
          </div>
        );
      },
    }),
  ];
}
