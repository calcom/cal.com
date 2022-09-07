import { SchedulingType } from "@prisma/client";
import { FC } from "react";

import { UserAvatars } from "@components/booking/UserAvatars";

import type { AvailabilityPageProps } from "../../pages/[user]/[type]";

interface Props {
  profile: AvailabilityPageProps["profile"];
  eventType: AvailabilityPageProps["eventType"];
  isBookingPage: boolean;
}

const BookingDescription: FC<Props> = (props) => {
  const { profile, eventType } = props;
  return (
    <>
      <UserAvatars
        profile={profile}
        users={eventType.users}
        showMembers={eventType.schedulingType !== SchedulingType.ROUND_ROBIN}
        size={10}
        truncateAfter={3}
      />
    </>
  );
};

export default BookingDescription;
