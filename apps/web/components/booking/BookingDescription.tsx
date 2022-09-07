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
      <h2 className="mt-2 break-words text-sm font-medium text-gray-500 dark:text-gray-300">
        {profile.name}
      </h2>
      <h1 className="font-cal dark:text-darkgray-900 break-words text-2xl text-gray-900 ">
        {eventType.title}
      </h1>
    </>
  );
};

export default BookingDescription;
