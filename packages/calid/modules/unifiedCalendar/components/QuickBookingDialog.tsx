import { Button } from "@calid/features/ui/components/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@calid/features/ui/components/dialog";
import { Input } from "@calid/features/ui/components/input/input";
import { TextArea } from "@calid/features/ui/components/input/text-area";
import { Label } from "@calid/features/ui/components/label";
import { format, setHours, setMinutes } from "date-fns";
import { type ChangeEvent, useMemo, useState } from "react";

import type { CalendarEvent, CalendarSource, QuickBookSlot } from "../lib/types";

interface QuickBookingDialogProps {
  open: boolean;
  slot: QuickBookSlot | null;
  isMobile: boolean;
  calendars: CalendarSource[];
  onClose: () => void;
  onSubmit: (event: Omit<CalendarEvent, "id">) => void;
}

interface QuickBookingFormProps {
  initialDate: Date;
  initialHour: number;
  calendars: CalendarSource[];
  onClose: () => void;
  onSubmit: (event: Omit<CalendarEvent, "id">) => void;
}

const DURATION_OPTIONS = ["15", "30", "45", "60", "90", "120"];

const QuickBookingForm = ({
  initialDate,
  initialHour,
  calendars,
  onClose,
  onSubmit,
}: QuickBookingFormProps) => {
  const [title, setTitle] = useState("");
  const [calendarId, setCalendarId] = useState(calendars[0]?.id || "");
  const [duration, setDuration] = useState("30");
  const [attendees, setAttendees] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [notes, setNotes] = useState("");

  const startTime = useMemo(
    () => setMinutes(setHours(initialDate, initialHour), 0),
    [initialDate, initialHour]
  );
  const endTime = useMemo(
    () => new Date(startTime.getTime() + Number.parseInt(duration, 10) * 60000),
    [duration, startTime]
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-muted-foreground text-xs">Event Title</Label>
        <Input
          placeholder="Meeting title"
          value={title}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)}
          className="h-9"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-xs">Date &amp; Time</Label>
          <div className="text-foreground/80 bg-muted/30 border-border/40 rounded-md border px-3 py-2 text-sm">
            {format(startTime, "MMM d, h:mm a")}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-xs">Duration</Label>
          <select
            value={duration}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => setDuration(event.target.value)}
            className="bg-default border-border/40 h-9 w-full rounded-md border px-3 text-sm outline-none">
            {DURATION_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {Number.parseInt(value, 10) < 60
                  ? `${value} min`
                  : `${Number.parseInt(value, 10) / 60} hr${Number.parseInt(value, 10) > 60 ? "s" : ""}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-muted-foreground text-xs">Calendar</Label>
        <select
          value={calendarId}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => setCalendarId(event.target.value)}
          className="bg-default border-border/40 h-9 w-full rounded-md border px-3 text-sm outline-none">
          {calendars.map((calendar) => (
            <option key={calendar.id} value={calendar.id}>
              {calendar.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-muted-foreground text-xs">Attendees</Label>
        <Input
          placeholder="email@example.com (comma separated)"
          value={attendees}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setAttendees(event.target.value)}
          className="h-9"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-muted-foreground text-xs">Meeting Link</Label>
        <Input
          placeholder="https://zoom.us/j/..."
          value={meetingLink}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setMeetingLink(event.target.value)}
          className="h-9"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-muted-foreground text-xs">Notes</Label>
        <TextArea
          placeholder="Add notes..."
          value={notes}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setNotes(event.target.value)}
          rows={2}
          className="resize-none"
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button color="minimal" size="sm" className="h-8 text-xs" onClick={onClose}>
          Cancel
        </Button>

        <Button
          size="sm"
          className="h-8 text-xs"
          disabled={!title.trim()}
          onClick={() => {
            onSubmit({
              title: title.trim(),
              start: startTime,
              end: endTime,
              calendarId,
              attendees: attendees
                .split(",")
                .map((attendee) => attendee.trim())
                .filter(Boolean),
              meetingLink: meetingLink || undefined,
              description: notes || undefined,
            });

            onClose();
          }}>
          Create Booking
        </Button>
      </div>
    </div>
  );
};

export const QuickBookingDialog = ({
  open,
  slot,
  isMobile,
  calendars,
  onClose,
  onSubmit,
}: QuickBookingDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className={isMobile ? "max-w-[95vw]" : "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle className="text-sm">New Booking</DialogTitle>
        </DialogHeader>

        {slot && (
          <QuickBookingForm
            initialDate={slot.date}
            initialHour={slot.hour}
            calendars={calendars}
            onClose={onClose}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
