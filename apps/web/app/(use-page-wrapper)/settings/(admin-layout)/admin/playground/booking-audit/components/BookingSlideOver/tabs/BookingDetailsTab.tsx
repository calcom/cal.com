"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Icon } from "@calcom/ui/components/icon";

import type { BookingTabProps } from "../types";

export function BookingDetailsTab({ booking }: BookingTabProps) {
  const { t } = useLocale();

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "green";
      case "cancelled":
        return "red";
      case "pending":
        return "yellow";
      case "completed":
        return "blue";
      default:
        return "gray";
    }
  };

  return (
    <div className="mt-6 flex-1 overflow-y-auto">
      <div className="space-y-6">
        {/* Booking Status */}
        <div className="flex items-center justify-between">
          <h3 className="text-emphasis text-lg font-semibold">Booking Status</h3>
          <Badge variant={getStatusColor(booking.status) as any} size="lg">
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Badge>
        </div>

        {/* Basic Details */}
        <div className="bg-muted rounded-lg p-4">
          <h4 className="text-emphasis mb-4 text-base font-semibold">Basic Information</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex items-center gap-2">
              <Icon name="calendar" className="text-subtle h-4 w-4" />
              <div>
                <div className="text-subtle text-sm">Date</div>
                <div className="text-emphasis text-sm font-medium">{formatDate(booking.startTime)}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Icon name="clock" className="text-subtle h-4 w-4" />
              <div>
                <div className="text-subtle text-sm">Time</div>
                <div className="text-emphasis text-sm font-medium">
                  {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Icon name="clock" className="text-subtle h-4 w-4" />
              <div>
                <div className="text-subtle text-sm">Duration</div>
                <div className="text-emphasis text-sm font-medium">{booking.duration} min</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Icon name="users" className="text-subtle h-4 w-4" />
              <div>
                <div className="text-subtle text-sm">Attendees</div>
                <div className="text-emphasis text-sm font-medium">{booking.attendees.length} people</div>
              </div>
            </div>
          </div>

          {booking.description && (
            <div className="mt-4">
              <div className="text-subtle text-sm">Description</div>
              <div className="text-emphasis mt-1 text-sm">{booking.description}</div>
            </div>
          )}
        </div>

        {/* Attendees */}
        <div className="bg-muted rounded-lg p-4">
          <h4 className="text-emphasis mb-4 text-base font-semibold">Attendees</h4>
          <div className="space-y-3">
            {booking.attendees.map((attendee, index) => (
              <div key={index} className="flex items-center gap-3">
                <Avatar size="sm" alt={attendee.name} />
                <div className="flex-1">
                  <div className="text-emphasis text-sm font-medium">{attendee.name}</div>
                  <div className="text-subtle text-xs">{attendee.email}</div>
                </div>
                <Badge variant={attendee.role === "host" ? "default" : "gray"} size="sm">
                  {attendee.role.charAt(0).toUpperCase() + attendee.role.slice(1)}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Meeting Link (placeholder) */}
        <div className="bg-muted rounded-lg p-4">
          <h4 className="text-emphasis mb-4 text-base font-semibold">Meeting Information</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Icon name="video" className="text-subtle h-4 w-4" />
              <div>
                <div className="text-subtle text-sm">Video Meeting</div>
                <div className="text-emphasis text-sm font-medium">Google Meet</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Icon name="map-pin" className="text-subtle h-4 w-4" />
              <div>
                <div className="text-subtle text-sm">Location</div>
                <div className="text-emphasis text-sm font-medium">Online meeting</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
