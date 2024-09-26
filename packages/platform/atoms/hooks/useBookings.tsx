import { useState } from "react";

import type { IUseBookings } from "@calcom/features/bookings/Booker/components/hooks/useBookings";
import { useBookerStore } from "@calcom/features/bookings/Booker/store";

export const useBookings = ({ event, hashedLink, bookingForm, metadata }: IUseBookings) => {
  const eventSlug = useBookerStore((state) => state.eventSlug);
  const setFormValues = useBookerStore((state) => state.setFormValues);
  const rescheduleUid = useBookerStore((state) => state.rescheduleUid);
  const bookingData = useBookerStore((state) => state.bookingData);
  const timeslot = useBookerStore((state) => state.selectedTimeslot);
  const seatedEventData = useBookerStore((state) => state.seatedEventData);
  const [expiryTime, setExpiryTime] = useState<Date | undefined>();
  const recurringEventCount = useBookerStore((state) => state.recurringEventCount);
  const isInstantMeeting = useBookerStore((state) => state.isInstantMeeting);
  const duration = useBookerStore((state) => state.selectedDuration);
  const hasInstantMeetingTokenExpired = expiryTime && new Date(expiryTime) < new Date();
};
