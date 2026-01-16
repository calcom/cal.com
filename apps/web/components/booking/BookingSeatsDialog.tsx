import { Button } from "@calid/features/ui/components/button";
import { Icon } from "@calid/features/ui/components/icon/Icon";
import { Input } from "@calid/features/ui/components/input/input";
import { ScrollArea } from "@calid/features/ui/components/scroll-area";
import type { BookingSeat } from "@prisma/client";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";

import dayjs from "@calcom/dayjs";
import { BookingSeatData } from "@calcom/features/bookings/lib/handleSeats/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/dialog";

// Add timezone support
dayjs.extend(utc);
dayjs.extend(timezone);

interface BookingSeatDialogData {
  referenceUid: string;
  data: BookingSeatData;
  createdAtUTC: string;
  attendee: {
    phoneNumber: string;
    email: string;
    name: string;
    timeZone: string;
  } | null;
  payment: Array<{
    success: boolean;
    amount: number;
    currency: string;
  }> | null;
  eventFields: any;
}

interface BookingSeatsDialogProps {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  bookingUid: string;
  bookingSeats: BookingSeatData[];
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
  userTimeFormat,
  eventFields,
}: BookingSeatsDialogProps) => {
  const { t } = useLocale();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSeats, setExpandedSeats] = useState<Set<string>>(new Set());

  // Filter booking seats based on search query
  const filteredSeats = useMemo(() => {
    if (!searchQuery.trim()) return bookingSeats;

    const query = searchQuery.toLowerCase();
    return bookingSeats.filter((seat) => {
      const attendeeName = seat.attendee?.name?.toLowerCase() || "";
      const attendeeEmail = seat.attendee?.email?.toLowerCase() || "";
      const hasPayment = seat.payment && seat.payment.length > 0;
      const paymentStatus = hasPayment ? (seat.payment![0]!.success ? "paid" : "pending").toLowerCase() : "";

      return attendeeName.includes(query) || attendeeEmail.includes(query) || paymentStatus.includes(query);
    });
  }, [bookingSeats, searchQuery]);

  // Determine if we should show search and use scrollable area
  const shouldShowSearch = bookingSeats.length > 5;
  const shouldUseScrollArea = bookingSeats.length > 5;

  // Toggle expanded view for a seat
  const toggleExpandedSeat = (referenceUid: string) => {
    setExpandedSeats((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(referenceUid)) {
        newSet.delete(referenceUid);
      } else {
        newSet.add(referenceUid);
      }
      return newSet;
    });
  };

  // Format booking time
  const formatBookingTime = (createdAtUTC: string, timezone: string) => {
    const createdAt = new Date(createdAtUTC);
    const formatter = new Intl.DateTimeFormat("en-IN", {
      timeZone: timezone,
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: userTimeFormat !== 24,
      timeZoneName: "short",
    });

    return formatter.format(createdAt);
  };

  // Get payment status badge color
  const getPaymentStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "refunded":
        return "bg-gray-100 text-default";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-default";
    }
  };

  // Extract custom fields from responses
  const getCustomFields = (responses: any) => {
    if (!responses) return {};

    const defaultFields = [
      "name",
      "email",
      "attendeePhoneNumber",
      "guests",
      "location",
      "title",
      // "notes",
      // "rescheduleReason",
    ];
    const customFields: Record<string, any> = {};

    for (const key in responses) {
      if (!defaultFields.includes(key)) {
        const eventFieldLabel = eventFields.find((e) => e.name === key)?.label;
        customFields[eventFieldLabel ?? key] = responses[key];
      }
    }

    return customFields;
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

  const renderPayment = (payment: any) => {
    return (
      <div className="flex-shrink-0 text-right">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${getPaymentStatusColor(
            payment.success ? "paid" : "pending"
          )}`}>
          {payment.success ? "Paid" : "Pending"}
        </span>
        {payment.amount && (
          <div className="text-default mt-1 text-xs">
            {(payment.amount / 100).toFixed(2)} {payment.currency?.toUpperCase()}
          </div>
        )}
      </div>
    );
  };

  const renderPhoneNumber = (phoneNumber: string) => {
    return (
      <div className="text-default flex flex-row items-center gap-1 text-xs">
        <Icon name="phone" className="h-3 w-3 flex-shrink-0" />
        <span className="truncate">{phoneNumber}</span>
      </div>
    );
  };

  const renderCustomFields = (responses: any) => {
    const customFields = getCustomFields(responses);

    if (Object.keys(customFields).length === 0) {
      return null;
    }

    return (
      <div className="mt-3 space-y-2 border-t border-gray-200 px-2 pt-3">
        {Object.entries(customFields).map(([key, value], index) => (
          <div className="flex flex-row justify-between" key={index}>
            <h4 className="text-default text-xs font-medium capitalize">
              {key.replace(/([A-Z])/g, " $1").trim()}
            </h4>
            <div className="text-default flex flex-row text-end text-xs">
              {(() => {
                const renderValue = (val: any) => {
                  if (Array.isArray(val)) {
                    if (val.length === 0) return null;
                    if (typeof val[0] === "object" && val[0] !== null && "url" in val[0]) {
                      return (
                        <ul >
                          {val.map((item: any, i: number) => (
                            <li key={i}>
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline">
                                {item.name || "Attachment"}
                              </a>
                            </li>
                          ))}
                        </ul>
                      );
                    }
                    return val.join(", ");
                  }
                  if (typeof val === "object" && val !== null) {
                    if ("url" in val) {
                      return (
                        <a
                          href={val.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline">
                          {val.name || "Attachment"}
                        </a>
                      );
                    }
                    if ("value" in val) {
                      return val.value || "-";
                    }
                    return JSON.stringify(val);
                  }
                  if (typeof val === "boolean") {
                    return val ? t("yes") : t("no");
                  }
                  return val?.toString() || "-";
                };
                return renderValue(value);
              })()}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSeatsList = () => {
    if (searchQuery && filteredSeats.length === 0) {
      return (
        <div className="text-default py-8 text-center text-sm">
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
          const isExpanded = expandedSeats.has(seat.referenceUid);
          const hasCustomFields = Object.keys(getCustomFields(seat.data?.responses)).length > 0;

          return (
            <div
              key={seat.referenceUid}
              className="rounded border border-gray-200 p-2 transition-colors hover:border-gray-300">
              {/* Attendee Information */}
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-row justify-between">
                    <div>
                      <div className="mb-1 flex items-center gap-1.5">
                        <Icon name="user" className="text-default h-3.5 w-3.5 flex-shrink-0" />
                        <h3 className="text-default truncate text-sm font-medium">
                          {attendee?.name || "Unknown Attendee"}
                        </h3>
                      </div>
                      <div className="text-default mb-0.5 flex flex-row items-center gap-2 text-xs">
                        {attendee?.email && (
                          <div className="flex flex-row items-center gap-1.5">
                            <Icon name="mail" className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{attendee?.email || "No email"}</span>
                          </div>
                        )}
                        {attendee?.phoneNumber && (
                          <div className="hidden md:block">{renderPhoneNumber(attendee?.phoneNumber)}</div>
                        )}
                      </div>

                      {attendee?.phoneNumber && (
                        <div className="block md:hidden">{renderPhoneNumber(attendee?.phoneNumber)}</div>
                      )}
                    </div>

                    {payment && renderPayment(payment)}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="text-default flex items-center gap-1.5 text-xs">
                      <Icon name="calendar" className="h-3 w-3 flex-shrink-0" />
                      <span>{formatBookingTime(seat.createdAtUTC, timezone)}</span>
                    </div>

                    {/* Expand/Collapse Button */}
                    {hasCustomFields && (
                      <Button
                        onClick={() => toggleExpandedSeat(seat.referenceUid)}
                        color="secondary"
                        className="text-default flex items-center gap-1 px-2 py-1 text-xs transition-colors "
                        aria-label={isExpanded ? "Collapse details" : "Expand details"}>
                        <div>{isExpanded ? t("hide_response") : t("view_response")}</div>
                        <Icon name={isExpanded ? "chevron-up" : "chevron-down"} className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Payment Status Badge */}
              </div>

              {/* Expanded Custom Fields */}
              {isExpanded && hasCustomFields && (
                <div className="animate-fade-in">{renderCustomFields(seat.data?.responses)}</div>
              )}
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

        <div className="p-0">
          {/* Search field */}
          {shouldShowSearch && (
            <div className="mb-3">
              <div className="relative">
                <Icon
                  name="search"
                  className="text-default absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                />
                <Input
                  type="text"
                  placeholder="Search by name, email, or payment status..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-9 text-sm"
                />
              </div>
              <p className="text-default mt-1 text-xs">
                Showing {filteredSeats.length} of {bookingSeats.length} seats
              </p>
            </div>
          )}

          {/* Seats list */}
          {shouldUseScrollArea ? (
            <ScrollArea className="h-[450px]">
              <div className="pr-3">{renderSeatsList()}</div>
            </ScrollArea>
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
