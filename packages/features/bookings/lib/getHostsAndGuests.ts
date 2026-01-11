export type Host = {
  id: number;
  email: string;
};

export type Guest = {
  email: string;
  name: string;
};

type BookingInput = {
  attendees?: { email: string; name: string }[] | null;
  user?: { id: number; email: string } | null;
  eventType?: {
    hosts?: { userId: number; user: { email: string } }[];
    users?: { id: number; email: string }[];
  } | null;
};

export function getHostsAndGuests(booking: BookingInput): { hosts: Host[]; guests: Guest[] } {
  const hostMap = new Map<number, Host>();

  const addHost = (id: number, email: string) => {
    if (!hostMap.has(id)) {
      hostMap.set(id, { id, email });
    }
  };

  booking?.eventType?.hosts?.forEach((host) => addHost(host.userId, host.user.email));
  booking?.eventType?.users?.forEach((user) => addHost(user.id, user.email));

  if (booking?.user?.id && booking?.user?.email) {
    addHost(booking.user.id, booking.user.email);
  }

  const attendeeEmails = new Set(booking.attendees?.map((attendee) => attendee.email) ?? []);
  const filteredHosts = Array.from(hostMap.values()).filter(
    (host) => attendeeEmails.has(host.email) || host.id === booking.user?.id
  );

  const hostEmails = new Set(filteredHosts.map((host) => host.email));
  const guests =
    booking.attendees?.filter((attendee) => !hostEmails.has(attendee.email)).map((attendee) => ({
      email: attendee.email,
      name: attendee.name,
    })) ?? [];

  return {
    hosts: filteredHosts,
    guests,
  };
}
