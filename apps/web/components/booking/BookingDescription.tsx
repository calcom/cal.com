import { SchedulingType } from "@prisma/client";
import { FC, ReactNode, useEffect } from "react";

import dayjs from "@calcom/dayjs";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon, Badge } from "@calcom/ui";

import useRouterQuery from "@lib/hooks/useRouterQuery";

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
  const { date: bookingDate } = useRouterQuery("date");
  const { t } = useLocale();
  const { duration = eventType.length.toString(), setQuery: setDuration } = useRouterQuery("duration");

  useEffect(() => {
    if (
      eventType.metadata?.multipleDuration &&
      !eventType.metadata?.multipleDuration?.includes(Number(duration))
    ) {
      setDuration(eventType.length.toString());
    }
  }, [duration, setDuration, eventType.length, eventType.metadata?.multipleDuration]);

  let requiresConfirmation = eventType?.requiresConfirmation;
  let requiresConfirmationText = t("requires_confirmation");
  const rcThreshold = eventType?.metadata?.requiresConfirmationThreshold;
  if (rcThreshold) {
    if (isBookingPage) {
      if (dayjs(bookingDate).diff(dayjs(), rcThreshold.unit) > rcThreshold.time) {
        requiresConfirmation = false;
      }
    } else {
      requiresConfirmationText = t("requires_confirmation_threshold", {
        ...rcThreshold,
        unit: rcThreshold.unit.slice(0, -1),
      });
    }
  }
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
      <div className="dark:text-darkgray-600 flex flex-col space-y-4 text-sm font-medium text-gray-600">
        {eventType?.description && (
          <div
            className={classNames(
              "flex",
              isBookingPage && "dark:text-darkgray-600 text-sm font-medium text-gray-600"
            )}>
            <div>
              <Icon.FiInfo
                className={classNames(
                  "ml-[2px] inline-block h-4 w-4 ltr:mr-[10px] rtl:ml-[10px]",
                  isBookingPage && "dark:text-darkgray-600 -mt-1 text-gray-500"
                )}
              />
            </div>
            <div className="max-w-[calc(100%_-_2rem)] flex-shrink break-words">
              <EventTypeDescriptionSafeHTML eventType={eventType} />
            </div>
          </div>
        )}
        {requiresConfirmation && (
          <div
            className={classNames(
              "items-top flex",
              isBookingPage && "dark:text-darkgray-600 text-sm font-medium text-gray-600"
            )}>
            <div>
              <Icon.FiCheckSquare className="ml-[2px] inline-block h-4 w-4 ltr:mr-[10px] rtl:ml-[10px] " />
            </div>
            {requiresConfirmationText}
          </div>
        )}
        <AvailableEventLocations
          locations={eventType.locations as AvailabilityPageProps["eventType"]["locations"]}
        />
        <div
          className={classNames(
            "flex flex-nowrap text-sm font-medium",
            isBookingPage && "dark:text-darkgray-600 text-gray-600"
          )}>
          <Icon.FiClock
            className={classNames(
              "min-h-4 min-w-4 ml-[2px] inline-block ltr:mr-[10px] rtl:ml-[10px]",
              isBookingPage && "mt-[2px]"
            )}
          />
          {eventType.metadata?.multipleDuration !== undefined ? (
            !isBookingPage ? (
              <ul className="-mt-1 flex flex-wrap gap-1">
                {eventType.metadata.multipleDuration.map((dur, idx) => (
                  <li key={idx}>
                    <Badge
                      variant="gray"
                      size="lg"
                      className={classNames(
                        duration === dur.toString()
                          ? "bg-darkgray-200 text-darkgray-900 dark:bg-darkmodebrand dark:!text-darkmodebrandcontrast"
                          : "hover:bg-darkgray-200 dark:hover:bg-darkmodebrand hover:text-darkgray-900 dark:hover:text-darkmodebrandcontrast dark:bg-darkgray-200 bg-gray-200 text-gray-900 dark:text-white",
                        "cursor-pointer"
                      )}
                      onClick={() => {
                        setDuration(dur);
                      }}>
                      {dur} {t("minute_timeUnit")}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              `${duration} ${t("minutes")}`
            )
          ) : (
            `${eventType.length} ${t("minutes")}`
          )}
        </div>
        {children}
      </div>
    </>
  );
};

export default BookingDescription;
