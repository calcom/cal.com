import { SchedulingType } from "@prisma/client";
import type { FC, ReactNode } from "react";
import { useEffect } from "react";

import dayjs from "@calcom/dayjs";
import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui";
import { CheckSquare, Clock } from "@calcom/ui/components/icon";

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
  const { duration, setQuery: setDuration } = useRouterQuery("duration");

  useEffect(() => {
    if (
      !duration ||
      isNaN(Number(duration)) ||
      (eventType.metadata?.multipleDuration &&
        !eventType.metadata?.multipleDuration.includes(Number(duration)))
    ) {
      setDuration(eventType.length);
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
        size="sm"
        truncateAfter={3}
      />
      <h2 className="text-default mt-1 mb-2 break-words text-sm font-medium ">{profile.name}</h2>
      <h1 className="font-cal  text-emphasis mb-6 break-words text-2xl font-semibold leading-none">
        {eventType.title}
      </h1>
      <div className=" text-default flex flex-col space-y-4 text-sm font-medium">
        {eventType?.description && (
          <div
            className={classNames(
              "scroll-bar scrollbar-track-w-20 -mx-5 flex max-h-[180px] overflow-y-scroll px-5 ",
              isBookingPage && "text-default text-sm font-medium"
            )}>
            {/* TODO: Fix colors when token is introdcued to DS */}
            <div className="max-w-full flex-shrink break-words [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-600">
              <EventTypeDescriptionSafeHTML eventType={eventType} />
            </div>
          </div>
        )}
        {requiresConfirmation && (
          <div className={classNames("items-top flex", isBookingPage && "text-default text-sm font-medium")}>
            <div>
              <CheckSquare className="ml-[2px] inline-block h-4 w-4 ltr:mr-[10px] rtl:ml-[10px] " />
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
            isBookingPage && "text-default",
            !eventType.metadata?.multipleDuration && "items-center"
          )}>
          <Clock
            className={classNames(
              "ml-[2px] inline-block h-4 w-4 ltr:mr-[10px] rtl:ml-[10px]",
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
                      className={classNames(
                        duration === dur.toString()
                          ? "bg-emphasis border-emphasis text-emphasis "
                          : "bg-subtle text-default border-transparent ",
                        "cursor-pointer border"
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
