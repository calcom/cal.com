"use client";

import { BookingHistory } from "./BookingHistory";

interface BookingHistoryPageProps {
  bookingUid: string;
}

/**
 * BookingHistoryPage - Wrapper component for standalone page context
 * Adds page-specific styling and layout for the booking history view
 */
export function BookingHistoryPage({ bookingUid }: BookingHistoryPageProps) {
  return <BookingHistory bookingUid={bookingUid} />;
}
