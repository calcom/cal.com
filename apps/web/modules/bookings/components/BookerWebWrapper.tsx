"use client";

import { sdkActionManager, useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { useBookerEmbedEvents } from "@calcom/embed-core/src/embed-iframe/react-hooks";
import type { BookerProps } from "@calcom/features/bookings/Booker";
import {
  BookerStoreProvider,
  useBookerStoreContext,
  useInitializeBookerStoreContext,
} from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { useBookerLayout } from "@calcom/features/bookings/Booker/hooks/useBookerLayout";
import { useBookingForm } from "@calcom/features/bookings/Booker/hooks/useBookingForm";
import { useBookings } from "../hooks/useBookings";
import { useCalendars } from "../hooks/useCalendars";
import { useSlots } from "../hooks/useSlots";
import { useVerifyCode } from "../hooks/useVerifyCode";
import { useVerifyEmail } from "../hooks/useVerifyEmail";
import { useInitializeBookerStore } from "@calcom/features/bookings/Booker/store";
import { useEvent, useScheduleForEvent } from "@calcom/features/bookings/Booker/utils/event";
import { useBrandColors } from "@calcom/features/bookings/Booker/utils/use-brand-colors";
import type { getPublicEvent } from "@calcom/features/eventtypes/lib/getPublicEvent";
import { DEFAULT_DARK_BRAND_COLOR, DEFAULT_LIGHT_BRAND_COLOR, WEBAPP_URL } from "@calcom/lib/constants";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { localStorage } from "@calcom/lib/webstorage";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo } from "react";
import { shallow } from "zustand/shallow";
import { Booker as BookerComponent } from "./Booker";

export type BookerWebWrapperAtomProps = BookerProps & {
  eventData?: NonNullable<Awaited<ReturnType<typeof getPublicEvent>>>;
};

const BookerWebWrapperComponent = (props: BookerWebWrapperAtomProps): JSX.Element => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const clientFetchedEvent = useEvent({
    disabled: !!props.eventData,
    fromRedirectOfNonOrgLink: props.entity.fromRedirectOfNonOrgLink,
  });
  const event = props.eventData
    ? {
        data: props.eventData,
        isSuccess: true,
        isError: false,
        isPending: false,
      }
    : clientFetchedEvent;

  const bookerLayout = useBookerLayout(event.data?.profile?.bookerLayouts);
  const selectedDate = useBookerStoreContext((state) => state.selectedDate);
  const isRedirect = searchParams?.get("redirected") === "true" || false;
  const fromUserNameRedirected = searchParams?.get("username") || "";
  const rescheduleUid =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("rescheduleUid") : null;
  const rescheduledBy =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("rescheduledBy") : null;
  const bookingUid =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("bookingUid") : null;
  const timezone = searchParams?.get("cal.tz") || null;

  useEffect(() => {
    // This event isn't processed by BookingPageTagManager because BookingPageTagManager hasn't loaded when it is fired. I think we should have a queue in fire method to handle this.
    sdkActionManager?.fire("navigatedToBooker", {});
  }, []);
  useInitializeBookerStore({
    ...props,
    eventId: props.entity.eventTypeId ?? event?.data?.id,
    rescheduleUid,
    rescheduledBy,
    bookingUid: bookingUid,
    layout: bookerLayout.isMobile ? "mobile" : bookerLayout.defaultLayout,
    org: props.entity.orgSlug,
    timezone,
  });
  useInitializeBookerStoreContext({
    ...props,
    eventId: props.entity.eventTypeId ?? event?.data?.id,
    rescheduleUid,
    rescheduledBy,
    bookingUid: bookingUid,
    layout: bookerLayout.isMobile ? "mobile" : bookerLayout.defaultLayout,
    org: props.entity.orgSlug,
    timezone,
  });

  const [dayCount] = useBookerStoreContext((state) => [state.dayCount, state.setDayCount], shallow);

  const { data: session } = useSession();
  const routerQuery = useRouterQuery();
  const hasSession = !!session;
  const firstNameQueryParam = searchParams?.get("firstName");
  const lastNameQueryParam = searchParams?.get("lastName");
  const metadata = Object.keys(routerQuery)
    .filter((key) => key.startsWith("metadata"))
    .reduce(
      (metadata, key) => ({
        ...metadata,
        [key.substring("metadata[".length, key.length - 1)]: searchParams?.get(key),
      }),
      {}
    );
  const prefillFormParams = useMemo(() => {
    return {
      name:
        searchParams?.get("name") ||
        (firstNameQueryParam ? `${firstNameQueryParam} ${lastNameQueryParam}` : null),
      guests: (searchParams?.getAll("guests") || searchParams?.getAll("guest")) ?? [],
    };
  }, [searchParams, firstNameQueryParam, lastNameQueryParam]);

  const bookerForm = useBookingForm({
    event: event.data,
    sessionEmail: session?.user.email,
    sessionUsername: session?.user.username,
    sessionName: session?.user.name,
    hasSession,
    extraOptions: routerQuery,
    prefillFormParams,
  });
  const calendars = useCalendars({ hasSession });
  const verifyEmail = useVerifyEmail({
    email: bookerForm.formEmail,
    name: bookerForm.formName,
    requiresBookerEmailVerification: event?.data?.requiresBookerEmailVerification,
    onVerifyEmail: bookerForm.beforeVerifyEmail,
  });
  const slots = useSlots(event?.data ? { id: event.data.id, length: event.data.length } : null);

  const isEmbed = useIsEmbed();

  /**
   * Prioritize dateSchedule load
   * Component will render but use data already fetched from here, and no duplicate requests will be made
   * */
  const schedule = useScheduleForEvent({
    eventId: props.entity.eventTypeId ?? event.data?.id,
    username: props.username,
    dayCount,
    eventSlug: props.eventSlug,
    month: props.month,
    duration: props.duration,
    selectedDate,
    teamMemberEmail: props.teamMemberEmail,
    fromRedirectOfNonOrgLink: props.entity.fromRedirectOfNonOrgLink,
    isTeamEvent: props.isTeamEvent ?? !!event.data?.team,
    useApiV2: props.useApiV2,
    bookerLayout,
    ...(props.entity.orgSlug ? { orgSlug: props.entity.orgSlug } : {}),
  });
  const bookings = useBookings({
    event,
    hashedLink: props.hashedLink,
    bookingForm: bookerForm.bookingForm,
    metadata: metadata ?? {},
    teamMemberEmail: props.teamMemberEmail,
  });

  useBookerEmbedEvents({
    eventId: event.data?.id,
    eventSlug: event.data?.slug,
    schedule,
  });

  const verifyCode = useVerifyCode({
    onSuccess: () => {
      if (!bookerForm.formEmail) return;

      verifyEmail.setVerifiedEmail(bookerForm.formEmail);
      verifyEmail.setEmailVerificationModalVisible(false);
      bookings.handleBookEvent();
    },
  });

  // Toggle query param for overlay calendar
  const onOverlaySwitchStateChange = useCallback(
    (state: boolean) => {
      const url = new URL(window.location.href);
      if (state) {
        url.searchParams.set("overlayCalendar", "true");
        localStorage.setItem("overlayCalendarSwitchDefault", "true");
      } else {
        url.searchParams.delete("overlayCalendar");
        localStorage.removeItem("overlayCalendarSwitchDefault");
      }
      router.push(`${url.pathname}${url.search}`);
    },
    [router]
  );
  useBrandColors({
    brandColor: event.data?.profile.brandColor ?? DEFAULT_LIGHT_BRAND_COLOR,
    darkBrandColor: event.data?.profile.darkBrandColor ?? DEFAULT_DARK_BRAND_COLOR,
    theme: event.data?.profile.theme,
  });

  const areInstantMeetingParametersSet = Boolean(
    event.data?.instantMeetingParameters &&
      searchParams &&
      event.data.instantMeetingParameters?.every?.((param) =>
        Array.from(searchParams.values()).includes(param)
      )
  );

  useEffect(() => {
    if (hasSession) onOverlaySwitchStateChange(true);
  }, [hasSession]);

  return (
    <BookerComponent
      {...props}
      onGoBackInstantMeeting={() => {
        if (pathname) window.location.href = pathname;
      }}
      onConnectNowInstantMeeting={() => {
        const newPath = `${pathname}?isInstantMeeting=true`;

        if (isEmbed) {
          const fullUrl = `${new URL(document.URL).origin}/${newPath}`;
          window.open(fullUrl, "_blank", "noopener,noreferrer");
        } else {
          router.push(newPath);
        }
      }}
      onOverlayClickNoCalendar={() => {
        router.push("/apps/categories/calendar");
      }}
      onClickOverlayContinue={() => {
        const newUrl = new URL(`${WEBAPP_URL}/login`);
        newUrl.searchParams.set("callbackUrl", window.location.pathname);
        newUrl.searchParams.set("overlayCalendar", "true");
        router.push(newUrl.toString());
      }}
      onOverlaySwitchStateChange={onOverlaySwitchStateChange}
      sessionUsername={session?.user.username}
      isRedirect={isRedirect}
      fromUserNameRedirected={fromUserNameRedirected}
      rescheduleUid={rescheduleUid}
      rescheduledBy={rescheduledBy}
      bookingUid={bookingUid}
      hasSession={hasSession}
      hasValidLicense={session?.hasValidLicense ?? false}
      extraOptions={routerQuery}
      bookings={bookings}
      calendars={calendars}
      slots={slots}
      verifyEmail={verifyEmail}
      bookerForm={bookerForm}
      event={event}
      bookerLayout={bookerLayout}
      schedule={schedule}
      verifyCode={verifyCode}
      isPlatform={false}
      areInstantMeetingParametersSet={areInstantMeetingParametersSet}
      userLocale={session?.user.locale}
      renderCaptcha
    />
  );
};

export const BookerWebWrapper = (props: BookerWebWrapperAtomProps) => {
  return (
    <BookerStoreProvider>
      <BookerWebWrapperComponent {...props} />
    </BookerStoreProvider>
  );
};
