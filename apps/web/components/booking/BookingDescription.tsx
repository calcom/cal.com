import { SchedulingType } from "@prisma/client";
import { BookPageProps } from "pages/[user]/book";
import { HashLinkPageProps } from "pages/d/[link]/book";
import { AvailabilityTeamPageProps } from "pages/team/[slug]/[type]";
import { TeamBookingPageProps } from "pages/team/[slug]/book";
import { FC, ReactNode } from "react";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui/Icon";

import { UserAvatars } from "@components/booking/UserAvatars";
import EventTypeDescriptionSafeHTML from "@components/eventtype/EventTypeDescriptionSafeHTML";

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
      <div
        className={classNames(
          "flex flex-col space-y-3",
          isBookingPage ? "mt-4 lg:mt-9" : "dark:text-darkgray-600 text-sm font-medium text-gray-600"
        )}>
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
            <EventTypeDescriptionSafeHTML eventType={eventType} />
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
        {children}
      </div>
    </>
  );
};

export default BookingDescription;
