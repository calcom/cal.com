import { SchedulingType } from "@prisma/client";
import { FC, ReactNode } from "react";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui/Icon";

import { UserAvatars } from "@components/booking/UserAvatars";
import EventTypeDescriptionSafeHTML from "@components/eventtype/EventTypeDescriptionSafeHTML";

import type { AvailabilityPageProps } from "../../pages/[user]/[type]";
import type { BookPageProps } from "../../pages/[user]/book";
import type { DynamicAvailabilityPageProps } from "../../pages/d/[link]/[slug]";
import type { HashLinkPageProps } from "../../pages/d/[link]/book";
import type { AvailabilityTeamPageProps } from "../../pages/team/[slug]/[type]";
import type { TeamBookingPageProps } from "../../pages/team/[slug]/book";
import { AvailableEventLocations } from "./AvailableEventLocations";

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
  isMobile?: boolean;
  rescheduleUid?: string;
}

const BookingDescription: FC<Props> = (props) => {
  const { profile, eventType, isBookingPage = false, children } = props;
  const { t } = useLocale();
  return (
    <>
      <UserAvatars
        profile={profile}
        users={eventType.users}
        showMembers={eventType.schedulingType !== SchedulingType.ROUND_ROBIN}
        size={10}
        truncateAfter={3}
      />
      <h2 className="mt-2 break-words text-sm font-medium text-gray-600 dark:text-gray-300">
        {profile.name}
      </h2>
      <h1 className="font-cal dark:text-darkgray-900 mb-6 break-words text-2xl font-semibold text-gray-900">
        {eventType.title}
      </h1>
      <div className="dark:text-darkgray-600 flex flex-col space-y-3 text-sm font-medium text-gray-600">
        {eventType?.description && (
          <div
            className={classNames(
              "flex",
              isBookingPage && "dark:text-darkgray-600 text-sm font-medium text-gray-600"
            )}>
            <div>
              <Icon.FiInfo
                className={classNames(
                  "mr-[10px] ml-[2px] inline-block h-4 w-4",
                  isBookingPage && "dark:text-darkgray-600 -mt-1 text-gray-500"
                )}
              />
            </div>
            <div className="max-w-[calc(100%_-_2rem)] flex-shrink break-words">
              <EventTypeDescriptionSafeHTML eventType={eventType} />
            </div>
          </div>
        )}
        {eventType?.requiresConfirmation && (
          <div
            className={classNames(
              "flex items-center",
              isBookingPage && "dark:text-darkgray-600 text-sm font-medium text-gray-600"
            )}>
            <div>
              <Icon.FiCheckSquare className="mr-[10px] ml-[2px] -mt-1 inline-block h-4 w-4 " />
            </div>
            {t("requires_confirmation")}
          </div>
        )}
        <AvailableEventLocations
          locations={eventType.locations as AvailabilityPageProps["eventType"]["locations"]}
        />
        <p
          className={classNames(
            "text-sm font-medium",
            isBookingPage && "dark:text-darkgray-600 text-gray-600"
          )}>
          <Icon.FiClock className="mr-[10px] -mt-1 ml-[2px] inline-block h-4 w-4" />
          {eventType.length} {t("minutes")}
        </p>
        {children}
      </div>
    </>
  );
};

export default BookingDescription;
