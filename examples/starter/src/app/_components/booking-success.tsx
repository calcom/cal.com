"use client";
import { useGetBooking, useCancelBooking } from "@calcom/atoms";
import dayjs from "dayjs";
import { CheckCircleIcon, CircleX, Loader } from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { env } from "~/env";
import Link from "next/link";
import { cn } from "~/lib/utils";

export const BookingSuccess = () => {
  const params = useSearchParams();
  const bookingUid = params.get("bookingUid");
  const expertUsername = params.get("expert");
  const { mutate: cancelBooking } = useCancelBooking({
    onSuccess: () => {
      refetch();
    },
  });
  const { isLoading, data: booking, refetch } = useGetBooking(bookingUid ?? "");
  //   [@calcom] The API returns the UID of the previous booking in case you'd like to show changed booking details in your UI.
  const bookingPrevious = useGetBooking(booking?.fromReschedule);
  if (!bookingUid) {
    return <div>No Booking UID.</div>;
  }

  if (isLoading) {
    return <Loader className="z-50 animate-spin place-self-center" />;
  }

  if (!booking) {
    return <div>Booking not found</div>;
  }

  const startTime = dayjs(booking?.startTime).format(
    12 === 12 ? "h:mma" : "HH:mm",
  );
  const endTime = dayjs(booking?.endTime).format(12 === 12 ? "h:mma" : "HH:mm");
  const date = dayjs(booking?.startTime).toDate();
  // const dateToday = dayjs(booking?.startTime).date();
  const year = dayjs(booking?.startTime).year();
  const day = dayjs(date).format("dddd");
  const dayAsNumber = dayjs(date).format("DD");
  const month = dayjs(date).format("MMMM");

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="space-y-4 px-8">
        <div className="flex items-center justify-center space-x-2">
          {booking.status.toLowerCase() === "cancelled" && (
            <div className="flex flex-col items-center space-y-4">
              <CircleX className="h-8 w-8 text-destructive" />
              <CardTitle className="text-2xl">Meeting Cancelled</CardTitle>
            </div>
          )}
          {booking.status.toLowerCase() === "accepted" && (
            <div className="flex flex-col items-center space-y-4">
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
              <CardTitle className="text-2xl">
                Meeting scheduled successfully
              </CardTitle>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6 px-8 pt-2 text-sm">
        <Separator className="mb-8" />
        <div className="grid gap-3">
          <ul className="grid gap-3">
            <li className="flex flex-col">
              <span className="font-semibold">What</span>
              <span
                className={cn(
                  "text-muted-foreground",
                  booking.status.toLowerCase() === "cancelled" &&
                    "line-through",
                )}
              >
                {booking.title
                  .split(`-${env.NEXT_PUBLIC_CAL_OAUTH_CLIENT_ID}`)?.[0]
                  ?.replace(".", " ") ?? booking.title}
              </span>
            </li>
            <li className="flex flex-col">
              <span className="font-semibold">When</span>
              <span
                className={cn(
                  "text-muted-foreground",
                  booking.status.toLowerCase() === "cancelled" &&
                    "line-through",
                )}
              >
                {day}, {month} {dayAsNumber} {year} | {startTime} - {endTime} (
                {booking?.user?.timeZone})
              </span>
            </li>
            <li className="flex flex-col">
              <span className="font-semibold">Who</span>
              <ul>
                <li className={cn(
                  "text-muted-foreground",
                  booking.status.toLowerCase() === "cancelled" &&
                    "line-through",
                )}>
                  {booking?.user?.name} (Host) -{" "}
                  {booking?.user?.email.replace(
                    `+${env.NEXT_PUBLIC_CAL_OAUTH_CLIENT_ID}`,
                    "",
                  )}
                </li>
                {(booking.attendees as Array<{email: string, name: string}>).map((attendee, idx) => (
                  <li key={idx} className={cn(
                    "text-muted-foreground",
                    booking.status.toLowerCase() === "cancelled" &&
                      "line-through",
                  )}>
                    {attendee.name
                      .split(`-${env.NEXT_PUBLIC_CAL_OAUTH_CLIENT_ID}`)?.[0]
                      ?.replace(".", " ") ?? attendee.name}{" "}
                    -{" "}
                    {attendee.email.replace(
                      `+${env.NEXT_PUBLIC_CAL_OAUTH_CLIENT_ID}`,
                      "",
                    )}
                  </li>
                ))}
              </ul>
            </li>
            <li className="flex flex-col">
              <span className="font-semibold">Where</span>
              <span
                className={cn(
                  "text-muted-foreground",
                  booking.status.toLowerCase() === "cancelled" &&
                    "line-through",
                )}
              >
                {Boolean(booking.location) ? (
                  booking.location
                ) : (
                  <Link
                    className={cn("underline", booking.status.toLowerCase() === "cancelled" && "cursor-not-allowed")}
                    href={booking.status.toLowerCase() === "cancelled" ? "#": (booking?.metadata as {videoCallUrl?: string})?.videoCallUrl ?? "#"}
                  >
                    Online (Cal Video)
                  </Link>
                )}
              </span>
            </li>
            {Boolean(booking.description) && (
              <li className="flex flex-col">
                <span className="font-semibold">Event Description</span>
                <span
                  className={cn(
                    "text-muted-foreground",
                    booking.status.toLowerCase() === "cancelled" &&
                      "line-through",
                  )}
                >
                  {booking.description}
                </span>
              </li>
            )}
          </ul>
        </div>
        {booking.status.toLowerCase() !== "cancelled" && (
          <Separator className="mt-8" />
        )}
      </CardContent>
      {booking.status.toLowerCase() !== "cancelled" && (
        <CardFooter className="flex flex-col px-8">
          <div>
            <span>Need to make changes? </span>
            <span>
              <Link
                href={`/experts/${expertUsername}?rescheduleUid=${bookingUid}`}
                className="underline"
              >
                Reschedule
              </Link>{" "}
              or{" "}
              <div
                className="cursor-pointer underline"
                onClick={() => {
                  return cancelBooking({
                    id: booking.id,
                    uid: booking.uid,
                    cancellationReason: "User request",
                    allRemainingBookings: true,
                  });
                }}
              >
                Cancel
              </div>
            </span>
          </div>
        </CardFooter>
      )}
    </Card>
  );
};

export default BookingSuccess;
