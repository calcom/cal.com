"use client";

import {
  BookerWebWrapper,
  type BookerWebWrapperAtomProps,
} from "@calcom/web/modules/bookings/components/BookerWebWrapper";
import { getBookerWrapperClasses } from "@calcom/features/bookings/Booker/utils/getBookerWrapperClasses";

import BookingPageErrorBoundary from "@components/error/BookingPageErrorBoundary";

export type TeamBookingPageProps = Omit<BookerWebWrapperAtomProps, "eventData"> &
  Required<Pick<BookerWebWrapperAtomProps, "eventData">> & { isEmbed?: boolean };

export default function TeamBookingPage(props: TeamBookingPageProps) {
  return (
    <BookingPageErrorBoundary>
      <main className={getBookerWrapperClasses({ isEmbed: !!props.isEmbed })}>
        <BookerWebWrapper {...props} />
      </main>
    </BookingPageErrorBoundary>
  );
}
