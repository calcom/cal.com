type Booking = {
  eventType: { team: { parentId: number | null } | null } | null;
  user: { movedToProfile: { organizationId: number } | null } | null;
};

export default function getOrganizationIdOfBooking(booking: Booking): number | null {
  return booking.eventType?.team?.parentId ?? booking.user?.movedToProfile?.organizationId ?? null;
}
