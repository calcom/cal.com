import { SchedulingType } from "@prisma/client";
import { BookPageProps } from "pages/[user]/book";
import { HashLinkPageProps } from "pages/d/[link]/book";
import { AvailabilityTeamPageProps } from "pages/team/[slug]/[type]";
import { TeamBookingPageProps } from "pages/team/[slug]/book";
import { FC, ReactNode } from "react";

import { classNames } from "@calcom/lib";

import { UserAvatars } from "@components/booking/UserAvatars";

import type { AvailabilityPageProps } from "../../pages/[user]/[type]";
import type { DynamicAvailabilityPageProps } from "../../pages/d/[link]/[slug]";

interface Props {
  profile:
    | AvailabilityPageProps["profile"]
    | HashLinkPageProps["profile"]
    | TeamBookingPageProps["profile"]
    | BookPageProps["profile"]
    | AvailabilityTeamPageProps["profile"]
    | DynamicAvailabilityPageProps["profile"];
  eventType:
    | AvailabilityPageProps["eventType"]
    | HashLinkPageProps["eventType"]
    | TeamBookingPageProps["eventType"]
    | BookPageProps["eventType"]
    | AvailabilityTeamPageProps["eventType"]
    | DynamicAvailabilityPageProps["eventType"];
  isBookingPage?: boolean;
  children: ReactNode;
}

const BookingDescription: FC<Props> = (props) => {
  const { profile, eventType, isBookingPage = false } = props;
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
