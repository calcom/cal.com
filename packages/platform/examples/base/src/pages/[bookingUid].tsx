import { Navbar } from "@/components/Navbar";
import { Inter } from "next/font/google";
// eslint-disable-next-line @calcom/eslint/deprecated-imports-next-router
import { useRouter } from "next/router";

import { useBooking, useCancelBooking } from "@calcom/atoms";
import dayjs from "@calcom/dayjs";
import { Icon } from "@calcom/ui/components/icon";

const inter = Inter({ subsets: ["latin"] });

export default function Bookings(props: { calUsername: string; calEmail: string }) {
  const router = useRouter();

  const { isLoading, data: booking, refetch } = useBooking((router.query.bookingUid as string) ?? "");
  const { mutate: cancelBooking } = useCancelBooking({
    onSuccess: () => {
      refetch();
    },
  });

  if (!Array.isArray(booking)) {
    const startTime = dayjs(booking?.start).format(12 === 12 ? "h:mma" : "HH:mm");
    const endTime = dayjs(booking?.end).format(12 === 12 ? "h:mma" : "HH:mm");
    const date = dayjs(booking?.start).toDate();
    const dateToday = dayjs(booking?.start).date();
    const year = dayjs(booking?.start).year();
    const day = dayjs(date).format("dddd");
    const month = dayjs(date).format("MMMM");

    return (
      <main
        className={`flex min-h-screen flex-col ${inter.className} main text-default flex min-h-full w-full flex-col items-center overflow-visible`}>
        <Navbar username={props.calUsername} />
        {isLoading && <p>Loading...</p>}
        {!isLoading && booking && (
          <div
            data-testid="booking-success-page"
            key={booking.id}
            className="my-10 w-[440px] overflow-hidden rounded-md border-[0.7px] border-black px-10 py-5">
            {booking.status === "accepted" ? (
              <div className="mx-2 my-4 flex flex-col items-center justify-center text-center">
                <Icon
                  name="circle-check-big"
                  className="my-5 flex h-[40px] w-[40px] rounded-full bg-green-500"
                />
                <h1 className="text-xl font-bold" data-testid="booking-success-message">
                  This meeting is scheduled
                </h1>
                <p>We sent an email with a calendar invitation with the details to everyone.</p>
              </div>
            ) : (
              <div className="mx-2 my-4 flex flex-col items-center justify-center text-center">
                <Icon name="x" className="my-5 flex h-[40px] w-[40px] rounded-full bg-red-400" />
                <h4 className="text-2xl font-bold">This event is cancelled</h4>
              </div>
            )}
            <hr className="mx-2 bg-black text-black" />
            <div className="mx-2 my-7 flex flex-col gap-y-3">
              <div className="flex gap-[70px]">
                <div>
                  <h4>What</h4>
                </div>
                <div>
                  <p>{typeof booking.title === "string" ? booking.title : "Untitled Event"}</p>
                </div>
              </div>
              <div className="flex gap-[70px]">
                <div>
                  <h4>When</h4>
                </div>
                <div>
                  <div>
                    <p
                      style={{
                        textDecoration: booking.status === "accepted" ? "normal" : "line-through",
                      }}>
                      {`${day}, ${month} ${dateToday}, ${year}`}
                    </p>
                  </div>
                  <div>
                    <p
                      style={{
                        textDecoration: booking.status === "accepted" ? "normal" : "line-through",
                      }}>
                      {`${startTime}`} - {`${endTime}`}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-[70px]">
                <div>Who</div>
                <div>
                  <div>
                    <div>
                      <h4>
                        {booking.hosts[0]?.name}{" "}
                        <span className="rounded-md bg-blue-800 px-2 text-sm text-white">Host</span>
                      </h4>
                    </div>
                  </div>
                  {booking.attendees.map((attendee, i) => {
                    return (
                      <div key={`${i}-${attendee.name}`}>
                        <br />
                        <div>
                          <h4>{`${attendee.name}`}</h4>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {!!booking.location && (
                <div className="flex gap-[70px]">
                  <div>
                    <h4>Where</h4>
                  </div>
                  <div>
                    <p>{booking.location}</p>
                  </div>
                </div>
              )}
              {"bookingFieldsResponses" in booking && !!booking.bookingFieldsResponses?.notes && (
                <div className="flex gap-[70px]">
                  <div className="w-[40px]">
                    <h4>Additional notes</h4>
                  </div>
                  <div>
                    <p>{`${booking.bookingFieldsResponses.notes}`}</p>
                  </div>
                </div>
              )}
            </div>

            {booking.status === "accepted" && (
              <>
                <hr className="mx-3" />
                <div className="mx-2 my-3 text-center">
                  <p data-testid="booking-redirect-or-cancel-links">
                    Need to make a change?{" "}
                    <button
                      className="underline"
                      onClick={() => {
                        router.push(
                          `/booking?rescheduleUid=${booking?.uid}&eventTypeSlug=${booking?.eventType.slug}&rescheduledBy=${props.calEmail}`
                        );
                      }}>
                      Reschedule
                    </button>{" "}
                    or{" "}
                    <button
                      className="underline"
                      onClick={() => {
                        cancelBooking({
                          id: booking.id,
                          uid: booking.uid,
                          cancellationReason: "User request",
                          allRemainingBookings: true,
                        });
                      }}>
                      Cancel
                    </button>
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    );
  }
}
