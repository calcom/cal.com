import { Icon } from "@calid/features/ui/components/icon/Icon";
import { Input } from "@calid/features/ui/components/input/input";
import { ScrollArea } from "@calid/features/ui/components/scroll-area";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import dayjs from "@calcom/dayjs";
import { Button } from "@calcom/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/dialog";
import type { BookingSeat } from "@prisma/client";

// Add timezone support
dayjs.extend(utc);
dayjs.extend(timezone);

interface BookingSeatData {
  referenceUid: string;
  attendee: {
    email: string;
    name: string;
    timeZone: string;
  } | null;
  payment: Array<{
    status: string;
    amount: number;
    currency: string;
  }> | null;
}

interface BookingSeatsDialogProps {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  bookingUid: string;
  bookingSeats: BookingSeatData[];
  bookingStartTime: Date;
  userTimeFormat: number | null;
}

/**
 * BookingSeatsDialog Component
 *
 * Displays all booking seats with attendee information, payment status, and booking time.
 */
export const BookingSeatsDialog = ({
  isOpenDialog,
  setIsOpenDialog,
  bookingUid,
  bookingSeats,
  bookingStartTime,
  userTimeFormat,
}: BookingSeatsDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter booking seats based on search query
  const filteredSeats = useMemo(() => {
    if (!searchQuery.trim()) return bookingSeats;

    const query = searchQuery.toLowerCase();
    return bookingSeats.filter((seat) => {
      const attendeeName = seat.attendee?.name?.toLowerCase() || "";
      const attendeeEmail = seat.attendee?.email?.toLowerCase() || "";
      const hasPayment = seat.payment && seat.payment.length > 0;
      const paymentStatus = hasPayment 
        ? (seat.payment[0].success ? "paid" : "pending").toLowerCase()
        : "";
      
      return (
        attendeeName.includes(query) ||
        attendeeEmail.includes(query) ||
        paymentStatus.includes(query)
      );
    });
  }, [bookingSeats, searchQuery]);

  // Determine if we should show search and use scrollable area
  const shouldShowSearch = bookingSeats.length > 5;
  const shouldUseScrollArea = bookingSeats.length > 5;

  // Format booking time
  const formatBookingTime = (startTime: Date, timezone: string) => {
    return dayjs(startTime)
      .tz(timezone)
      .format(userTimeFormat === 24 ? "dddd, D MMM YYYY HH:mm" : "dddd, D MMM YYYY h:mm A");
  };

  // Get payment status badge color
  const getPaymentStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "refunded":
        return "bg-gray-100 text-gray-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  // Show message if no booking seats available
  if (bookingSeats.length === 0) {
    return (
      <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
        <DialogContent>
          <DialogHeader title="Booking Seats" subtitle="No booking seats found" />
          <DialogFooter>
            <DialogClose className="border">Close</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const renderSeatsList = () => {
    if (searchQuery && filteredSeats.length === 0) {
      return (
        <div className="py-8 text-center text-sm text-gray-500">
          No booking seats found matching "{searchQuery}"
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {filteredSeats.map((seat) => {
          const attendee = seat.attendee;
          const payment = seat.payment?.[0];
          const timezone = attendee?.timeZone || "UTC";

          return (
            <div
              key={seat.referenceUid}
              className="rounded border border-gray-200 p-3 hover:border-gray-300 transition-colors"
            >
              {/* Attendee Information */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon name="user" className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                    <h3 className="font-medium text-sm text-gray-900 truncate">
                      {attendee?.name || "Unknown Attendee"}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-0.5">
                    <Icon name="mail" className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{attendee?.email || "No email"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <Icon name="globe" className="h-3 w-3 flex-shrink-0" />
                    <span>{timezone}</span>
                  </div>
                </div>
                
                {/* Payment Status Badge */}
                {payment && (
                  <div className="text-right flex-shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(
                        payment.success ? "paid" : "pending"
                      )}`}
                    >
                      {payment.success ? "Paid" : "Pending"}
                    </span>
                    {payment.amount && (
                      <div className="mt-1 text-xs text-gray-600">
                        {(payment.amount / 100).toFixed(2)} {payment.currency?.toUpperCase()}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Booking Time */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-xs text-gray-700">
                  <Icon name="calendar" className="h-3 w-3 text-gray-500 flex-shrink-0" />
                  <span className="font-medium">
                    {formatBookingTime(bookingStartTime, timezone)}
                  </span>
                </div>
              </div>

              {/* Reference UID */}
              <div className="mt-1.5 text-xs text-gray-500 truncate">
                Ref: {seat.referenceUid}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent enableOverflow>
        <DialogHeader
          title="Booking Seats"
          subtitle={`${bookingSeats.length} seat${bookingSeats.length !== 1 ? "s" : ""} for this booking`}
        />

        <div>
          {/* Search field */}
          {shouldShowSearch && (
            <div className="mb-3">
              <div className="relative">
                <Icon
                  name="search"
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                />
                <Input
                  type="text"
                  placeholder="Search by name, email, or payment status..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Showing {filteredSeats.length} of {bookingSeats.length} seats
              </p>
            </div>
          )}

          {/* Seats list */}
          {shouldUseScrollArea ? (
            <ScrollArea className="h-[450px] pr-3">{renderSeatsList()}</ScrollArea>
          ) : (
            renderSeatsList()
          )}
        </div>

        <DialogFooter>
          <DialogClose className="border">Close</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};