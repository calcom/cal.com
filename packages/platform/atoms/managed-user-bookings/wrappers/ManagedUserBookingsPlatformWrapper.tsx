import { AtomsWrapper } from "@/components/atoms-wrapper";

import { useBookings } from "../../hooks/bookings/useBookings";

export const ManagedUserBookingsPlatformWrapper = () => {
  const { data: upcomingBookings } = useBookings({
    take: 150,
    skip: 0,
    status: ["upcoming"],
  });

  console.log("-------");
  console.log("these are the upcoming bookings of the user");
  console.log(upcomingBookings);
  console.log("-------");

  return <AtomsWrapper>This is the managed users booking atom!</AtomsWrapper>;
};
