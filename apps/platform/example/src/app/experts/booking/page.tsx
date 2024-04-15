
import { PageProps } from ".next/types/app/page";
import { BookingSuccess } from "~/app/_components/booking-success";

export const BookingPage = async (props: PageProps) => {
  // const bookingUid = props.searchParams.get("bookingUid");
  return <div className="flex justify-center items-center py-20">
    <BookingSuccess />
  </div>;
};
export default BookingPage;