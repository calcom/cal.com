import { addDays, setHours, setMinutes } from "date-fns";

import { PALETTE } from "./constants";
import type { LegacyMockCalendar, LegacyMockEvent } from "./types";

export const generateMockData = () => {
  const today = new Date();

  const calendars: LegacyMockCalendar[] = [
    {
      id: "cal-1",
      name: "Work",
      provider: "google",
      email: "user@gmail.com",
      color: PALETTE.slateBlue,
      visible: true,
    },
    {
      id: "cal-2",
      name: "Personal",
      provider: "google",
      email: "user@gmail.com",
      color: PALETTE.softEmerald,
      visible: true,
    },
    {
      id: "cal-3",
      name: "Leadership",
      provider: "outlook",
      email: "user@outlook.com",
      color: PALETTE.mutedPurple,
      visible: true,
    },
    {
      id: "cal-4",
      name: "Office 365",
      provider: "outlook",
      email: "user@outlook.com",
      color: PALETTE.neutralGray,
      visible: true,
    },
  ];

  const events: LegacyMockEvent[] = [
    {
      id: "e1",
      title: "Team Standup",
      start: setMinutes(setHours(today, 9), 0),
      end: setMinutes(setHours(today, 9), 30),
      calendarId: "cal-1",
      attendees: ["alice@co.com", "bob@co.com"],
      location: "Room 3A",
      meetingLink: "https://meet.google.com/abc",
    },
    {
      id: "e2",
      title: "Product Review",
      start: setMinutes(setHours(today, 11), 0),
      end: setMinutes(setHours(today, 12), 0),
      calendarId: "cal-1",
      attendees: ["pm@co.com"],
      meetingLink: "https://zoom.us/j/123",
    },
    {
      id: "e3",
      title: "Lunch with Sarah",
      start: setMinutes(setHours(today, 12), 30),
      end: setMinutes(setHours(today, 13), 30),
      calendarId: "cal-2",
      attendees: ["sarah@email.com"],
      location: "Downtown Cafe",
    },
    {
      id: "e4",
      title: "Client Call",
      start: setMinutes(setHours(today, 14), 0),
      end: setMinutes(setHours(today, 15), 0),
      calendarId: "cal-3",
      attendees: ["client@biz.com", "pm@co.com"],
      meetingLink: "https://teams.microsoft.com/l/meetup-join/abc",
    },
    {
      id: "e5",
      title: "Sprint Planning",
      start: setMinutes(setHours(today, 15), 30),
      end: setMinutes(setHours(today, 16), 30),
      calendarId: "cal-4",
      attendees: ["team@co.com"],
      location: "Main Conference Room",
    },
    {
      id: "e6",
      title: "Yoga Class",
      start: setMinutes(setHours(today, 18), 0),
      end: setMinutes(setHours(today, 19), 0),
      calendarId: "cal-2",
      attendees: [],
    },
    {
      id: "e7",
      title: "Design Review",
      start: setMinutes(setHours(addDays(today, 1), 10), 0),
      end: setMinutes(setHours(addDays(today, 1), 11), 0),
      calendarId: "cal-1",
      attendees: ["designer@co.com"],
    },
    {
      id: "e8",
      title: "1:1 with Manager",
      start: setMinutes(setHours(addDays(today, 1), 14), 0),
      end: setMinutes(setHours(addDays(today, 1), 14), 45),
      calendarId: "cal-1",
      attendees: ["manager@co.com"],
    },
    {
      id: "e9",
      title: "Board Meeting",
      start: setMinutes(setHours(today, 14), 0),
      end: setMinutes(setHours(today, 15), 30),
      calendarId: "cal-4",
      attendees: ["board@co.com"],
      description: "Quarterly board meeting",
      location: "Boardroom",
    },
    {
      id: "e10",
      title: "Workshop",
      start: setMinutes(setHours(addDays(today, 2), 9), 0),
      end: setMinutes(setHours(addDays(today, 2), 12), 0),
      calendarId: "cal-3",
      attendees: ["team@co.com"],
    },
  ];

  return { calendars, events };
};
