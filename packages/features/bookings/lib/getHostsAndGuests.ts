export type Host = {
  id: number;
  email: string;
};

export type Guest = {
  email: string;
  name: string;
  id?: number;
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
    booking.attendees
      ?.filter((attendee) => !hostEmails.has(attendee.email))
      .map((attendee) => ({
        email: attendee.email,
        name: attendee.name,
        id: undefined, // Initially set to undefined, will be populated later if user is found
      })) ?? [];

  return {
    hosts: filteredHosts,
    guests,
  };
}

export async function getGuestAvailability(guests: Guest[]): Promise<Set<string>> {
  const unavailableTimeSlots = new Set<string>();

  if (!guests.length) {
    return unavailableTimeSlots;
  }

  try {
    // In a real implementation, we would fetch availability for each guest
    // For now, we'll simulate this by returning an empty set
    // Actual implementation would call an API endpoint like `/availability` for each guest
    // Example:
    // for (const guest of guests) {
    //   if (guest.id) {
    //     const availability = await fetchGuestAvailability(guest.id);
    //     availability.unavailableSlots.forEach(slot => unavailableTimeSlots.add(slot));
    //   }
    // }
  } catch (error) {
    console.error("Failed to fetch guest availability", error);
  }

  return unavailableTimeSlots;
}

async function fetchGuestAvailability(userId: number): Promise<{ unavailableSlots: string[] }> {
  // This is a placeholder for the actual implementation
  // In a real app, this would call the availability endpoint
  return { unavailableSlots: [] };
}