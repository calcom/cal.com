import { useMemo } from "react";

interface UseBookingHostsParams<
  T extends { email: string },
  U extends { id: number; name: string | null; email: string } = {
    id: number;
    name: string | null;
    email: string;
  }
> {
  bookingUser?: { id: number; name: string | null; email: string } | null;
  eventTypeUsers?: Array<U>;
  attendees?: Array<T>;
}

export function useBookingHosts<
  T extends { email: string },
  U extends { id: number; name: string | null; email: string } = {
    id: number;
    name: string | null;
    email: string;
  }
>({ bookingUser, eventTypeUsers, attendees }: UseBookingHostsParams<T, U>) {
  const hosts = useMemo(() => {
    if (!bookingUser || !attendees) return { organizer: null, teamMembers: [], attendees: [] as T[] };

    const attendeeEmails = new Set(attendees.map((a) => a.email));

    // Filter team members who are actual hosts (in attendees list)
    const teamMembers =
      eventTypeUsers?.filter((user) => user.id !== bookingUser.id && attendeeEmails.has(user.email)) ?? [];

    // Filter out hosts from attendees list
    const hostEmails = new Set([bookingUser.email, ...teamMembers.map((tm) => tm.email)]);

    const regularAttendees = attendees.filter((a) => !hostEmails.has(a.email));

    return {
      organizer: bookingUser,
      teamMembers,
      attendees: regularAttendees,
    };
  }, [bookingUser, eventTypeUsers, attendees]);

  return hosts;
}
