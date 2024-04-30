

import { Suspense } from "react";
import { BookingSuccess } from "~/app/_components/booking-success";

export default  function GettingStarted() {
  // const bookingUid = props.searchParams.get("bookingUid");
  return <div className="flex justify-center items-center py-20">
    <Suspense>
    <BookingSuccess />
    </Suspense>
  </div>;
};