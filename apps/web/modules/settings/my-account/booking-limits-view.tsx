"use client";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";

import GlobalBookingLimitsController from "@components/settings/GlobalBookingLimitsController";

interface BookingLimitsViewProps {
  user: RouterOutputs["viewer"]["me"]["get"];
}

const BookingLimitsView = ({ user }: BookingLimitsViewProps) => {
  const { t } = useLocale();

  return (
    <SettingsHeader title={t("booking_limits")} description={t("booking_limits_global_description")}>
      <GlobalBookingLimitsController bookingLimits={user.bookingLimits} />
    </SettingsHeader>
  );
};

export default BookingLimitsView;
