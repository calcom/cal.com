import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "next/navigation";
import { shallow } from "zustand/shallow";

import type { BookerProps } from "@calcom/features/bookings/Booker";
import { useBookerLayout } from "@calcom/features/bookings/Booker/components/hooks/useBookerLayout";
import { useBookingForm } from "@calcom/features/bookings/Booker/components/hooks/useBookingForm";
import { useBookerStore, useInitializeBookerStore } from "@calcom/features/bookings/Booker/store";

import { useMe } from "../hooks/useMe";
import { usePublicEvent } from "../hooks/usePublicEvent";

type BookerPlatformWrapperAtomProps = BookerProps & {
  rescheduleUid?: string;
  bookingUid?: string;
  firstName?: string;
  lastName?: string;
  guests?: string[];
  name?: string;
};

export const BookerPlatformWrapper = (props: BookerPlatformWrapperAtomProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const event = usePublicEvent();

  const bookerLayout = useBookerLayout(event.data);

  useInitializeBookerStore({
    ...props,
    eventId: event.data?.id,
    rescheduleUid: props.rescheduleUid ?? null,
    bookingUid: props.bookingUid ?? null,
    layout: bookerLayout.defaultLayout,
    org: props.entity.orgSlug,
  });
  const [bookerState, _] = useBookerStore((state) => [state.state, state.setState], shallow);
  const [dayCount] = useBookerStore((state) => [state.dayCount, state.setDayCount], shallow);
  const { data: session } = useMe();
  const hasSession = !!session;
  const bookerForm = useBookingForm({
    event: event.data,
    sessionEmail: session?.data?.user?.email,
    sessionUsername: session?.data?.user?.username,
    sessionName: session?.data?.user?.name,
    hasSession,
    extraOptions: {},
    prefillFormParams: { guests: props.guests ?? [], name: props.name ?? null },
  });

  console.log(session, event);

  return <></>;
};
