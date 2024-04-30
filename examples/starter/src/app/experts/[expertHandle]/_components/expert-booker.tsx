"use client";
import { Booker, useEventTypesPublic } from "@calcom/atoms";
import type { CalAccount, User } from "@prisma/client";
import { Loader } from "lucide-react";

import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

type BookerProps = Parameters<typeof Booker>[number];
export const ExpertBooker = (
  props: {
    className?: string;
    calAccount: CalAccount;
    expert: User;
  } & BookerProps,
) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rescheduleUid = searchParams.get("rescheduleUid") ?? undefined;
  const { isLoading: isLoadingEvents, data: eventTypes } = useEventTypesPublic(
    props.calAccount.username,
  );
  if (!props.calAccount.username) {
    return (
      <div className="w-full text-center">
        Sorry. We couldn&apos;t find this experts&apos; user.
      </div>
    );
  }
  if (isLoadingEvents) {
    return <Loader className="z-50 animate-spin place-self-center" />;
  }
  if (!eventTypes?.length) {
    return (
      <div className="w-full text-center">
        Sorry. Unable to load ${props.expert.name}&apos;s availabilities.
      </div>
    );
  }

  return (
    <Booker
      // @eslint-disabled @typescript-eslint/no-unsafe-member-access: the useEventTypesPublic hook is returning any      eventSlug={eventTypes[0].slug}
      username={props.calAccount.username}
      onCreateBookingSuccess={(booking) => {
        console.log("booking: ", booking, "uid: ", booking.data.uid);
        toast.success("Booking successful! ");
        router.push(
          // @ts-expect-error types are broken on the data right now
          `/experts/booking?${new URLSearchParams({ bookingUid: booking.data.uid, expert: props.expert.username }).toString()}`,
        );
      }}
      rescheduleUid={rescheduleUid}
    />
  );
};
export default ExpertBooker;
