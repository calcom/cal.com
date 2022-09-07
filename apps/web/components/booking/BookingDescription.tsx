import { SchedulingType } from "@prisma/client";
import { FC } from "react";

import { classNames } from "@calcom/lib";

import { UserAvatars } from "@components/booking/UserAvatars";

import type { AvailabilityPageProps } from "../../pages/[user]/[type]";

interface Props {
  profile: AvailabilityPageProps["profile"];
  eventType: AvailabilityPageProps["eventType"];
  isBookingPage: boolean;
}

const BookingDescription: FC<Props> = (props) => {
  const { profile, eventType, isBookingPage } = props;
  return (
    <>
      <UserAvatars
        profile={profile}
        users={eventType.users}
        showMembers={eventType.schedulingType !== SchedulingType.ROUND_ROBIN}
        size={10}
        truncateAfter={3}
      />
      <h2
        className={classNames(
          "break-words text-sm font-medium dark:text-gray-300",
          isBookingPage ? "mt-2 text-gray-500" : "text-gray-600 lg:mt-2"
        )}>
        {profile.name}
      </h2>
      <h1
        className={classNames(
          "font-cal dark:text-darkgray-900 break-words text-2xl text-gray-900",
          !isBookingPage && "mb-6"
        )}>
        {eventType.title}
      </h1>
    </>
  );
};

export default BookingDescription;
