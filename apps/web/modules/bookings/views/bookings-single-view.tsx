"use client";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import classNames from "classnames";
import { createEvent } from "ics";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Toaster } from "react-hot-toast";
import { RRule } from "rrule";
import { z } from "zod";

import BookingPageTagManager from "@calcom/app-store/BookingPageTagManager";
import type { getEventLocationValue } from "@calcom/app-store/locations";
import { getSuccessPageLocationMessage, guessEventLocationType } from "@calcom/app-store/locations";
import { getEventTypeAppData } from "@calcom/app-store/utils";
import type { nameObjectSchema } from "@calcom/core/event";
import { getEventName } from "@calcom/core/event";
import type { ConfigType } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { getOrgFullOrigin } from "@calcom/ee/organizations/lib/orgDomains";
import {
  useEmbedNonStylesConfig,
  useIsBackgroundTransparent,
  useIsEmbed,
} from "@calcom/embed-core/embed-iframe";
import { Price } from "@calcom/features/bookings/components/event-meta/Price";
import {
  SMS_REMINDER_NUMBER_FIELD,
  SystemField,
  TITLE_FIELD,
} from "@calcom/features/bookings/lib/SystemField";
import { cpfMask } from "@calcom/features/form-builder/utils";
import {
  formatToLocalizedDate,
  formatToLocalizedTime,
  formatToLocalizedTimezone,
} from "@calcom/lib/date-fns";
import useGetBrandingColours from "@calcom/lib/getBrandColours";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import useTheme from "@calcom/lib/hooks/useTheme";
import { getEveryFreqFor } from "@calcom/lib/recurringStrings";
import { getIs24hClockFromLocalStorage, isBrowserLocale24h } from "@calcom/lib/timeFormat";
import { localStorage } from "@calcom/lib/webstorage";
import { BookingStatus, SchedulingType } from "@calcom/prisma/enums";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  EmptyScreen,
  HeadSeo,
  Icon,
  TextArea,
  showToast,
  useCalcomTheme,
} from "@calcom/ui";
import PageWrapper from "@calcom/web/components/PageWrapper";
import CancelBooking from "@calcom/web/components/booking/CancelBooking";
import RejectBooking from "@calcom/web/components/booking/RejectBooking";
import EventReservationSchema from "@calcom/web/components/schemas/EventReservationSchema";
import { timeZone } from "@calcom/web/lib/clock";

import { GifModal } from "~/bookings/views/components/GifModal";

import type { PageProps } from "./bookings-single-view.getServerSideProps";

enum BookingTypes {
  MEDIC_APPOINTMENT = "Consulta Médica",
  URGENT_APPOINTMENT = "Consulta Médica de Urgência",
  OCCUPATIONAL_THERAPY = "Sessão de Terapia Ocupacional",
  COGNTIVE_BEHAVIORAL_THERAPY = "Sessão de Psicologia",
}

enum VariantDescription {
  PAST_APPOINTMENT = "Para reagendar uma evento passado será necessário realizar o pagamento de uma taxa de 50% do valor da sessão. Caso opte pelo cancelamento, você não terá direito de reembolso.",
  HAS_STARTED = "Em caso de não comparecimento após 15 minutos do horário agendado, será necessário realizar o pagamento de uma taxa de 50% do valor do serviço para reagendar. Caso opte pelo cancelamento, você não terá direito à reembolso.",
  URGENT_MEDICAL_APPOINTMENT = "Para reagendar uma consulta de emergência, será cobrada uma nova consulta. Caso opte pelo cancelamento, você não terá direito à reembolso.",
  LESS_THAN_12_HOURS = "Para reagendar com menos de 12h de antecedência, será necessário pagar uma taxa de 50% do valor do serviço. Caso opte pelo cancelamento, você não terá direito à reembolso.",
  MORE_THAN_12_HOURS_LESS_THAN_7_DAYS = "Você tem direito ao reagendamento deste evento sem custo ou reembolso integral em caso de cancelamento.",
  MORE_THAN_7_DAYS = "Você pode reagendar este evento sem custo algum. Caso opte pelo cancelamento, você não terá direito à reembolso pois já se passaram mais de 7 dias da contratação do plano.",
  NO_SHOW_PROFESSIONAL = "Infelizmente o profissional não pôde comparecer a este agendamento. Você tem direito ao reagendamento deste evento sem custo ou reembolso integral em caso de cancelamento.",
}

interface RescheduleOrCancelWarningProps {
  description: string;
}

interface EventType {
  [key: string]: string;
}

interface BookingInfo {
  cancelledBy: string;
  createdAt: string;
  absentHost: boolean;
  title: string;
  uid: string;
}

const stringToBoolean = z
  .string()
  .optional()
  .transform((val) => val === "true");

const querySchema = z.object({
  uid: z.string(),
  email: z.string().optional(),
  eventTypeSlug: z.string().optional(),
  cancel: stringToBoolean,
  reject: stringToBoolean,
  allRemainingBookings: stringToBoolean,
  changes: stringToBoolean,
  reschedule: stringToBoolean,
  isSuccessBookingPage: stringToBoolean,
  formerTime: z.string().optional(),
  seatReferenceUid: z.string().optional(),
  rating: z.string().optional(),
  noShow: stringToBoolean,
});

const useBrandColors = ({
  brandColor,
  darkBrandColor,
}: {
  brandColor?: string | null;
  darkBrandColor?: string | null;
}) => {
  const brandTheme = useGetBrandingColours({
    lightVal: brandColor,
    darkVal: darkBrandColor,
  });
  useCalcomTheme(brandTheme);
};

const RescheduleOrCancelWarning = ({ description }: RescheduleOrCancelWarningProps) => {
  if (description === "") return null;
  return (
    <div className="my-6 flex items-center rounded border border-[#E6EBF0] bg-[#F4F6F8] p-2 text-xs text-[#598392]">
      <svg
        className="mr-2"
        width="32"
        height="32"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <path
          d="M7.33398 11.3333H8.66732V7.33325H7.33398V11.3333ZM8.00065 5.99992C8.18954 5.99992 8.34787 5.93603 8.47565 5.80825C8.60343 5.68047 8.66732 5.52214 8.66732 5.33325C8.66732 5.14436 8.60343 4.98603 8.47565 4.85825C8.34787 4.73047 8.18954 4.66658 8.00065 4.66658C7.81176 4.66658 7.65343 4.73047 7.52565 4.85825C7.39787 4.98603 7.33398 5.14436 7.33398 5.33325C7.33398 5.52214 7.39787 5.68047 7.52565 5.80825C7.65343 5.93603 7.81176 5.99992 8.00065 5.99992ZM8.00065 14.6666C7.07843 14.6666 6.21176 14.4916 5.40065 14.1416C4.58954 13.7916 3.88398 13.3166 3.28398 12.7166C2.68398 12.1166 2.20898 11.411 1.85898 10.5999C1.50898 9.78881 1.33398 8.92214 1.33398 7.99992C1.33398 7.0777 1.50898 6.21103 1.85898 5.39992C2.20898 4.58881 2.68398 3.88325 3.28398 3.28325C3.88398 2.68325 4.58954 2.20825 5.40065 1.85825C6.21176 1.50825 7.07843 1.33325 8.00065 1.33325C8.92287 1.33325 9.78954 1.50825 10.6007 1.85825C11.4118 2.20825 12.1173 2.68325 12.7173 3.28325C13.3173 3.88325 13.7923 4.58881 14.1423 5.39992C14.4923 6.21103 14.6673 7.0777 14.6673 7.99992C14.6673 8.92214 14.4923 9.78881 14.1423 10.5999C13.7923 11.411 13.3173 12.1166 12.7173 12.7166C12.1173 13.3166 11.4118 13.7916 10.6007 14.1416C9.78954 14.4916 8.92287 14.6666 8.00065 14.6666ZM8.00065 13.3333C9.48954 13.3333 10.7507 12.8166 11.784 11.7833C12.8173 10.7499 13.334 9.48881 13.334 7.99992C13.334 6.51103 12.8173 5.24992 11.784 4.21659C10.7507 3.18325 9.48954 2.66659 8.00065 2.66659C6.51176 2.66659 5.25065 3.18325 4.21732 4.21659C3.18398 5.24992 2.66732 6.51103 2.66732 7.99992C2.66732 9.48881 3.18398 10.7499 4.21732 11.7833C5.25065 12.8166 6.51176 13.3333 8.00065 13.3333Z"
          fill="#598392"
        />
      </svg>

      <span>{description}</span>
    </div>
  );
};

export default function Success(props: PageProps) {
  const { t } = useLocale();
  const router = useRouter();
  const routerQuery = useRouterQuery();
  const pathname = usePathname();
  const searchParams = useCompatSearchParams();
  const { eventType, bookingInfo, requiresLoginToUpdate, orgSlug, rescheduledToUid } = props;
  const [purchaseDate, setPurchaseDate] = useState<dayjs.Dayjs | null>(null);
  const [absentHost, setAbsentHost] = useState<boolean>(false);
  const [eventTypes, setEventTypes] = useState<EventType | null>(null);
  const [appointmentType, setAppointmentType] = useState<BookingTypes | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isCancellationMode, setIsCancellationMode] = useState(searchParams.get("cancel") === "true");

  const {
    allRemainingBookings,
    isSuccessBookingPage,
    reject: isRejectionMode,
    formerTime,
    email,
    seatReferenceUid,
    noShow,
    rating,
  } = querySchema.parse(routerQuery);

  const attendeeTimeZone = bookingInfo?.attendees.find((attendee) => attendee.email === email)?.timeZone;

  const isFeedbackMode = !!(noShow || rating);
  const tz = props.tz ? props.tz : isSuccessBookingPage && attendeeTimeZone ? attendeeTimeZone : timeZone();

  const location = bookingInfo.location as ReturnType<typeof getEventLocationValue>;
  let rescheduleLocation: string | undefined;
  if (
    typeof bookingInfo.responses?.location === "object" &&
    "optionValue" in bookingInfo.responses.location
  ) {
    rescheduleLocation = bookingInfo.responses.location.optionValue;
  }

  const locationVideoCallUrl: string | undefined = bookingMetadataSchema.parse(
    bookingInfo?.metadata || {}
  )?.videoCallUrl;

  const status = bookingInfo?.status;
  const reschedule = bookingInfo.status === BookingStatus.ACCEPTED;
  const cancellationReason = bookingInfo.cancellationReason || bookingInfo.rejectionReason;

  const attendees = bookingInfo?.attendees;

  const isGmail = !!attendees.find((attendee) => attendee.email.includes("gmail.com"));

  const [is24h, setIs24h] = useState(
    props?.userTimeFormat ? props.userTimeFormat === 24 : isBrowserLocale24h()
  );
  const { data: session } = useSession();

  const [date, setDate] = useState(dayjs.utc(bookingInfo.startTime));

  const isBackgroundTransparent = useIsBackgroundTransparent();
  const isEmbed = useIsEmbed();
  const shouldAlignCentrallyInEmbed = useEmbedNonStylesConfig("align") !== "left";
  const shouldAlignCentrally = !isEmbed || shouldAlignCentrallyInEmbed;
  const [calculatedDuration, setCalculatedDuration] = useState<number | undefined>(undefined);
  const [comment, setComment] = useState("");
  const parsedRating = rating ? parseInt(rating, 10) : 3;
  const currentUserEmail =
    searchParams?.get("cancelledBy") ?? searchParams?.get("email") ?? session?.user?.email ?? undefined;

  const defaultRating = isNaN(parsedRating) ? 3 : parsedRating > 5 ? 5 : parsedRating < 1 ? 1 : parsedRating;
  const [rateValue, setRateValue] = useState<number>(defaultRating);
  const [isFeedbackSubmitted, setIsFeedbackSubmitted] = useState(false);

  const mutation = trpc.viewer.public.submitRating.useMutation({
    onSuccess: async () => {
      setIsFeedbackSubmitted(true);
      showToast("Thank you, feedback submitted", "success");
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  const hostNoShowMutation = trpc.viewer.public.markHostAsNoShow.useMutation({
    onSuccess: async () => {
      showToast("Thank you, feedback submitted", "success");
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  useEffect(() => {
    if (noShow) {
      hostNoShowMutation.mutate({ bookingUid: bookingInfo.uid, noShowHost: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendFeedback = async (rating: string, comment: string) => {
    mutation.mutate({ bookingUid: bookingInfo.uid, rating: rateValue, comment: comment });
  };

  function setIsRejectionMode() {
    const _searchParams = new URLSearchParams(searchParams ?? undefined);

    if (_searchParams.get("reject")) {
      _searchParams.delete("reject");
    }

    router.replace(`${pathname}?${_searchParams.toString()}`);
  }

  let evtName = eventType.eventName;
  if (eventType.isDynamic && bookingInfo.responses?.title) {
    evtName = bookingInfo.responses.title as string;
  }
  const eventNameObject = {
    attendeeName: bookingInfo.responses.name as z.infer<typeof nameObjectSchema> | string,
    eventType: eventType.title,
    eventName: evtName,
    host: props.profile.name || "Nameless",
    location: location,
    bookingFields: bookingInfo.responses,
    eventDuration: eventType.length,
    t,
  };

  const giphyAppData = getEventTypeAppData(eventType, "giphy");
  const giphyImage = giphyAppData?.thankYouPage;
  const isRoundRobin = eventType.schedulingType === SchedulingType.ROUND_ROBIN;

  const eventName = getEventName(eventNameObject, true);
  // Confirmation can be needed in two cases as of now
  // - Event Type has require confirmation option enabled always
  // - EventType has conditionally enabled confirmation option based on how far the booking is scheduled.
  // - It's a paid event and payment is pending.
  const needsConfirmation = bookingInfo.status === BookingStatus.PENDING && eventType.requiresConfirmation;
  const userIsOwner = !!(session?.user?.id && eventType.owner?.id === session.user.id);
  const isLoggedIn = session?.user;
  const isCancelled =
    status === "CANCELLED" ||
    status === "REJECTED" ||
    (!!seatReferenceUid &&
      !bookingInfo.seatsReferences.some((reference) => reference.referenceUid === seatReferenceUid));

  // const telemetry = useTelemetry();
  /*  useEffect(() => {
    if (top !== window) {
      //page_view will be collected automatically by _middleware.ts
      telemetry.event(telemetryEventTypes.embedView, collectPageParameters("/booking"));
    }
  }, [telemetry]); */

  useEffect(() => {
    setDate(
      date.tz(localStorage.getItem("timeOption.preferredTimeZone") || dayjs.tz.guess() || "Europe/London")
    );
    setIs24h(props?.userTimeFormat ? props.userTimeFormat === 24 : !!getIs24hClockFromLocalStorage());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType, needsConfirmation]);

  useEffect(() => {
    if (pathname && pathname.includes("/booking/")) {
      const bookingUID = pathname.split("/booking/")[1].split("?")[0];

      const getEventTypeSlugUrl =
        "https://ogbfbwkftgpdiejqafdq.supabase.co/rest/v1/EventType?id=in.(1196,1550,1374,1145,1545,1378,1146)";
      const getBookedTimeUrl = `https://ogbfbwkftgpdiejqafdq.supabase.co/rest/v1/Booking?uid=eq.${bookingUID}`;

      fetch(getEventTypeSlugUrl, {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_API_KEY || "",
        },
      }).then((data) => {
        data.json().then((response: EventType[]) => {
          const eventSlugs = response.reduce((acc, { id, slug }) => {
            return { ...acc, [id]: slug };
          }, eventTypes);
          setEventTypes(eventSlugs);
        });
      });

      fetch(getBookedTimeUrl, {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_API_KEY || "",
        },
      }).then((data) => {
        data.json().then((response: BookingInfo[]) => {
          const findedBooking = response[0];
          setPurchaseDate(dayjs(findedBooking?.createdAt));
          setAbsentHost(!!findedBooking?.absentHost && !!findedBooking?.cancelledBy);
          setAppointmentType((_prev) => {
            switch (true) {
              case findedBooking?.title.includes(BookingTypes.URGENT_APPOINTMENT):
                return BookingTypes.URGENT_APPOINTMENT;
              case findedBooking?.title.includes(BookingTypes.MEDIC_APPOINTMENT):
                return BookingTypes.MEDIC_APPOINTMENT;
              case findedBooking?.title.includes(BookingTypes.OCCUPATIONAL_THERAPY):
                return BookingTypes.OCCUPATIONAL_THERAPY;
              case findedBooking?.title.includes(BookingTypes.COGNTIVE_BEHAVIORAL_THERAPY):
                return BookingTypes.COGNTIVE_BEHAVIORAL_THERAPY;
              default:
                return null;
            }
          });
        });
      });
    }
  }, [eventTypes, pathname]);

  useEffect(() => {
    setCalculatedDuration(dayjs(bookingInfo.endTime).diff(dayjs(bookingInfo.startTime), "minutes"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function eventLink(): string {
    const optional: { location?: string } = {};
    if (locationVideoCallUrl) {
      optional["location"] = locationVideoCallUrl;
    }

    const event = createEvent({
      start: [
        date.toDate().getUTCFullYear(),
        (date.toDate().getUTCMonth() as number) + 1,
        date.toDate().getUTCDate(),
        date.toDate().getUTCHours(),
        date.toDate().getUTCMinutes(),
      ],
      startInputType: "utc",
      title: eventName,
      description: eventType.description ? eventType.description : undefined,
      /** formatted to required type of description ^ */
      duration: {
        minutes: calculatedDuration,
      },
      ...optional,
    });

    if (event.error) {
      throw event.error;
    }

    return encodeURIComponent(event.value ? event.value : false);
  }

  function getTitle(): string {
    const titleSuffix = props.recurringBookings ? "_recurring" : "";
    const titlePrefix = isRoundRobin ? "round_robin_" : "";
    if (isCancelled)
      return "Se o seu cancelamento é elegível para um reembolso, você poderá acompanhar as atualizações diretamente pelo App.";

    if (needsConfirmation) {
      if (props.profile.name !== null) {
        return t(`user_needs_to_confirm_or_reject_booking${titleSuffix}`, {
          user: props.profile.name,
        });
      }
      return t(`needs_to_be_confirmed_or_rejected${titleSuffix}`);
    }
    if (bookingInfo.user) {
      return t(`${titlePrefix}emailed_you_and_attendees${titleSuffix}`, {
        user: bookingInfo.user.name || bookingInfo.user.email,
      });
    }
    return t(`emailed_you_and_attendees${titleSuffix}`);
  }

  // This is a weird case where the same route can be opened in booking flow as a success page or as a booking detail page from the app
  // As Booking Page it has to support configured theme, but as booking detail page it should not do any change. Let Shell.tsx handle it.
  useTheme("light");
  useBrandColors({
    brandColor: props.profile.brandColor,
    darkBrandColor: props.profile.darkBrandColor,
  });
  const title = t(
    `booking_${needsConfirmation ? "submitted" : "confirmed"}${props.recurringBookings ? "_recurring" : ""}`
  );

  const locationToDisplay = getSuccessPageLocationMessage(
    locationVideoCallUrl ? locationVideoCallUrl : location,
    t,
    bookingInfo.status
  );

  const rescheduleLocationToDisplay = getSuccessPageLocationMessage(
    rescheduleLocation ?? "",
    t,
    bookingInfo.status
  );

  const providerName = guessEventLocationType(location)?.label;
  const rescheduleProviderName = guessEventLocationType(rescheduleLocation)?.label;
  const isBookingInPast = new Date(bookingInfo.endTime) < new Date();
  const isReschedulable = !isCancelled;

  const bookingCancelledEventProps = {
    booking: bookingInfo,
    organizer: {
      name: bookingInfo?.user?.name || "Nameless",
      email: bookingInfo?.userPrimaryEmail || bookingInfo?.user?.email || "Email-less",
      timeZone: bookingInfo?.user?.timeZone,
    },
    eventType,
  };

  const isRecurringBooking = props.recurringBookings;
  const needsConfirmationAndReschedulable = needsConfirmation && isReschedulable;
  const isNotAttendingSeatedEvent = isCancelled && seatReferenceUid;
  const isEventCancelled = isCancelled && !seatReferenceUid;
  const isPastBooking = isBookingInPast;
  const isntAuthenticated = session === null && !(userIsOwner || props.hideBranding);

  const { description, rescheduleRoute } = useMemo(() => {
    const currentTime = dayjs();
    const startTime = dayjs(bookingInfo.startTime);
    const pastAppointment = isPastBooking;
    const hasStarted = currentTime.isAfter(startTime);
    const moreOrEqualThan12HoursInAdvance = currentTime.isBefore(startTime.subtract(12, "hours"));
    const lessThan12HoursInAdvance = !moreOrEqualThan12HoursInAdvance;
    const lessThan7DaysFromPurchase = purchaseDate?.isAfter(currentTime.subtract(7, "days"));
    const moreOrEqualThan7DaysFromPurchase = !lessThan7DaysFromPurchase;

    if (!purchaseDate || !eventTypes || !appointmentType) return { description: "", rescheduleRoute: "" };

    const baseRescheduleRoute = `https://agenda.yinflow.life/${props.profile.slug}/`;
    const urgentMedicalAppointments = appointmentType === BookingTypes.URGENT_APPOINTMENT;
    const medicalAppointments = appointmentType === BookingTypes.MEDIC_APPOINTMENT;
    const occupationalTherapy = appointmentType === BookingTypes.OCCUPATIONAL_THERAPY;
    const cognitiveBehavioralTherapy = appointmentType === BookingTypes.COGNTIVE_BEHAVIORAL_THERAPY;

    switch (true) {
      case absentHost && medicalAppointments:
        return {
          description: VariantDescription.NO_SHOW_PROFESSIONAL,
          rescheduleRoute: baseRescheduleRoute + eventTypes["1145"],
        };
      case absentHost && occupationalTherapy:
        return {
          description: VariantDescription.NO_SHOW_PROFESSIONAL,
          rescheduleRoute: baseRescheduleRoute + eventTypes["1545"],
        };
      case absentHost && cognitiveBehavioralTherapy:
        return {
          description: VariantDescription.NO_SHOW_PROFESSIONAL,
          rescheduleRoute: baseRescheduleRoute + eventTypes["1378"],
        };
      case urgentMedicalAppointments:
        return {
          description: VariantDescription.URGENT_MEDICAL_APPOINTMENT,
          rescheduleRoute: `/reschedule/${seatReferenceUid || bookingInfo?.uid}${
            currentUserEmail ? `?rescheduledBy=${currentUserEmail}` : ""
          }`,
        };
      case pastAppointment && medicalAppointments:
        return {
          description: VariantDescription.PAST_APPOINTMENT,
          rescheduleRoute: baseRescheduleRoute + eventTypes["1196"],
        };
      case pastAppointment && occupationalTherapy:
        return {
          description: VariantDescription.PAST_APPOINTMENT,
          rescheduleRoute: baseRescheduleRoute + eventTypes["1550"],
        };
      case pastAppointment && cognitiveBehavioralTherapy:
        return {
          description: VariantDescription.PAST_APPOINTMENT,
          rescheduleRoute: baseRescheduleRoute + eventTypes["1374"],
        };
      case pastAppointment && urgentMedicalAppointments:
        return {
          description: VariantDescription.PAST_APPOINTMENT,
          rescheduleRoute: baseRescheduleRoute + eventTypes["1146"],
        };
      case hasStarted && medicalAppointments:
        return {
          description: VariantDescription.HAS_STARTED,
          rescheduleRoute: baseRescheduleRoute + eventTypes["1196"],
        };
      case hasStarted && occupationalTherapy:
        return {
          description: VariantDescription.HAS_STARTED,
          rescheduleRoute: baseRescheduleRoute + eventTypes["1550"],
        };
      case hasStarted && cognitiveBehavioralTherapy:
        return {
          description: VariantDescription.HAS_STARTED,
          rescheduleRoute: baseRescheduleRoute + eventTypes["1374"],
        };
      case hasStarted && urgentMedicalAppointments:
        return {
          description: VariantDescription.HAS_STARTED,
          rescheduleRoute: baseRescheduleRoute + eventTypes["1146"],
        };
      case lessThan12HoursInAdvance && medicalAppointments:
        return {
          description: VariantDescription.LESS_THAN_12_HOURS,
          rescheduleRoute: baseRescheduleRoute + eventTypes["1196"],
        };
      case lessThan12HoursInAdvance && occupationalTherapy:
        return {
          description: VariantDescription.LESS_THAN_12_HOURS,
          rescheduleRoute: baseRescheduleRoute + eventTypes["1550"],
        };
      case lessThan12HoursInAdvance && cognitiveBehavioralTherapy:
        return {
          description: VariantDescription.LESS_THAN_12_HOURS,
          rescheduleRoute: baseRescheduleRoute + eventTypes["1374"],
        };
      case moreOrEqualThan7DaysFromPurchase && medicalAppointments:
        return {
          description: VariantDescription.MORE_THAN_7_DAYS,
          rescheduleRoute: baseRescheduleRoute + eventTypes["1145"],
        };
      case moreOrEqualThan7DaysFromPurchase && occupationalTherapy:
        return {
          description: VariantDescription.MORE_THAN_7_DAYS,
          rescheduleRoute: baseRescheduleRoute + eventTypes["1545"],
        };
      case moreOrEqualThan7DaysFromPurchase && cognitiveBehavioralTherapy:
        return {
          description: VariantDescription.MORE_THAN_7_DAYS,
          rescheduleRoute: baseRescheduleRoute + eventTypes["1378"],
        };
      case moreOrEqualThan12HoursInAdvance && lessThan7DaysFromPurchase && medicalAppointments:
        return {
          description: VariantDescription.MORE_THAN_12_HOURS_LESS_THAN_7_DAYS,
          rescheduleRoute: baseRescheduleRoute + eventTypes["1145"],
        };
      case moreOrEqualThan12HoursInAdvance && lessThan7DaysFromPurchase && occupationalTherapy:
        return {
          description: VariantDescription.MORE_THAN_12_HOURS_LESS_THAN_7_DAYS,
          rescheduleRoute: baseRescheduleRoute + eventTypes["1545"],
        };
      case moreOrEqualThan12HoursInAdvance && lessThan7DaysFromPurchase && cognitiveBehavioralTherapy:
        return {
          description: VariantDescription.MORE_THAN_12_HOURS_LESS_THAN_7_DAYS,
          rescheduleRoute: baseRescheduleRoute + eventTypes["1378"],
        };
      default:
        return { description: "", rescheduleRoute: "" };
    }
  }, [
    appointmentType,
    bookingInfo.startTime,
    bookingInfo?.uid,
    currentUserEmail,
    eventTypes,
    isPastBooking,
    absentHost,
    props.profile.slug,
    purchaseDate,
    seatReferenceUid,
  ]);

  const successPageHeadline = (() => {
    if (needsConfirmationAndReschedulable) {
      return isRecurringBooking ? t("booking_submitted_recurring") : t("booking_submitted");
    }

    if (isNotAttendingSeatedEvent) {
      return t("no_longer_attending");
    }

    if (isEventCancelled) {
      return t("event_cancelled");
    }

    if (isPastBooking) {
      return t("event_is_in_the_past");
    }

    return isRecurringBooking ? t("meeting_is_scheduled_recurring") : t("meeting_is_scheduled");
  })();

  const isCancelableOrRescheduble =
    !requiresLoginToUpdate && (!needsConfirmation || !userIsOwner) && isReschedulable && !isRejectionMode;

  // if (!userIsOwner)
  //   return (
  //     <div className={isEmbed ? "" : "h-screen"} data-testid="success-page">
  //       <HeadSeo origin={getOrgFullOrigin(orgSlug)} title={title} description={title} />
  //       <BookingPageTagManager eventType={eventType} />
  //       <main className={classNames(shouldAlignCentrally ? "mx-auto" : "", isEmbed ? "" : "max-w-3xl")}>
  //         <div className={classNames("overflow-y-auto", isEmbed ? "" : "z-50 ")}>
  //           <div
  //             className={classNames(
  //               shouldAlignCentrally ? "text-center" : "",
  //               "flex items-end justify-center px-4 pb-20 pt-4 sm:flex sm:p-0"
  //             )}>
  //             <div
  //               className={classNames(
  //                 "main my-4 flex flex-col transition-opacity sm:my-0 ",
  //                 isEmbed ? "" : " inset-0"
  //               )}
  //               aria-hidden="true">
  //               <div
  //                 className={classNames(
  //                   "inline-block transform overflow-hidden rounded-lg border sm:my-8 sm:max-w-xl",
  //                   !isBackgroundTransparent && " bg-default dark:bg-muted border-booker border-booker-width",
  //                   "px-8 pb-4 pt-5 text-left align-bottom transition-all sm:w-full sm:py-8 sm:align-middle"
  //                 )}
  //                 role="dialog"
  //                 aria-modal="true"
  //                 aria-labelledby="modal-headline">
  //                 <h3
  //                   className="text-emphasis text-2xl font-semibold leading-6"
  //                   data-testid={isCancelled ? "cancelled-headline" : ""}
  //                   id="modal-headline">
  //                   Ops! Parece que você não tem permissão para ver os dados desse evento.
  //                 </h3>
  //                 <div className="mt-3">
  //                   <p className="text-default">
  //                     {isntAuthenticated
  //                       ? "Para ver os detalhes deste evento, faça o login no seu navegador com o e-mail que você agendou neste atendimento"
  //                       : "Caso você acredite que há algum erro, contate o time de suporte."}
  //                   </p>
  //                 </div>
  //               </div>
  //             </div>
  //           </div>
  //         </div>
  //       </main>
  //     </div>
  //   );

  return (
    <div className={isEmbed ? "" : "h-screen"} data-testid="success-page">
      <GifModal
        visible={showModal}
        onClose={() => {
          setShowModal(false);
        }}
      />
      {!isEmbed && !isFeedbackMode && (
        <EventReservationSchema
          reservationId={bookingInfo.uid}
          eventName={eventName}
          startTime={bookingInfo.startTime}
          endTime={bookingInfo.endTime}
          organizer={bookingInfo.user}
          attendees={bookingInfo.attendees}
          location={locationToDisplay}
          description={bookingInfo.description}
          status={status}
        />
      )}
      {isLoggedIn && !isEmbed && !isFeedbackMode && (
        <div className="-mb-4 ml-4 mt-2">
          <Link
            href={allRemainingBookings ? "/bookings/recurring" : "/bookings/upcoming"}
            data-testid="back-to-bookings"
            className="hover:bg-subtle text-subtle hover:text-default mt-2 inline-flex px-1 py-2 text-sm transition dark:hover:bg-transparent">
            <Icon name="chevron-left" className="h-5 w-5 rtl:rotate-180" /> {t("back_to_bookings")}
          </Link>
        </div>
      )}
      <HeadSeo origin={getOrgFullOrigin(orgSlug)} title={title} description={title} />
      <BookingPageTagManager eventType={eventType} />
      <main className={classNames(shouldAlignCentrally ? "mx-auto" : "", isEmbed ? "" : "max-w-3xl")}>
        <div className={classNames("overflow-y-auto", isEmbed ? "" : "z-50 ")}>
          <div
            className={classNames(
              shouldAlignCentrally ? "text-center" : "",
              "flex items-end justify-center px-4 pb-20 pt-4 sm:flex sm:p-0"
            )}>
            <div
              className={classNames(
                "main my-4 flex flex-col transition-opacity sm:my-0 ",
                isEmbed ? "" : " inset-0"
              )}
              aria-hidden="true">
              <div
                className={classNames(
                  "inline-block transform overflow-hidden rounded-lg border sm:my-8 sm:max-w-xl",
                  !isBackgroundTransparent && " bg-default dark:bg-muted border-booker border-booker-width",
                  "px-8 pb-4 pt-5 text-left align-bottom transition-all sm:w-full sm:py-8 sm:align-middle"
                )}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-headline">
                {!isFeedbackMode && (
                  <>
                    <div
                      className={classNames(isRoundRobin && "relative mx-auto h-24 min-h-24 w-32 min-w-32")}>
                      {isRoundRobin && bookingInfo.user && (
                        <Avatar
                          className="mx-auto flex items-center justify-center"
                          alt={bookingInfo.user.name || bookingInfo.user.email}
                          size="xl"
                          imageSrc={`${bookingInfo.user.avatarUrl}`}
                        />
                      )}
                      {giphyImage && !needsConfirmation && isReschedulable && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={giphyImage} className="w-full rounded-lg" alt="Gif from Giphy" />
                      )}
                      <div
                        className={classNames(
                          "mx-auto flex h-12 w-12 items-center justify-center rounded-full",
                          isRoundRobin &&
                            "border-cal-bg dark:border-cal-bg-muted absolute bottom-0 right-0 z-10 h-12 w-12 border-8",
                          !giphyImage && isReschedulable && !needsConfirmation ? "bg-success" : "",
                          !giphyImage && isReschedulable && needsConfirmation ? "bg-subtle" : "",
                          isCancelled ? "bg-error" : ""
                        )}>
                        {!giphyImage && !needsConfirmation && isReschedulable && (
                          <Icon name="check" className="h-5 w-5 text-green-600 dark:text-green-400" />
                        )}
                        {needsConfirmation && isReschedulable && (
                          <Icon name="calendar" className="text-emphasis h-5 w-5" />
                        )}
                        {isCancelled && <Icon name="x" className="h-5 w-5 text-red-600 dark:text-red-200" />}
                      </div>
                    </div>
                    <div className="mb-8 mt-6 text-center last:mb-0">
                      <h3
                        className="text-emphasis text-2xl font-semibold leading-6"
                        data-testid={isCancelled ? "cancelled-headline" : ""}
                        id="modal-headline">
                        {successPageHeadline}
                      </h3>
                      <div className="mt-3">
                        <p className="text-default">{getTitle()}</p>
                      </div>
                      {props.paymentStatus &&
                        (bookingInfo.status === BookingStatus.CANCELLED ||
                          bookingInfo.status === BookingStatus.REJECTED) && (
                          <h4>
                            {!props.paymentStatus.success &&
                              !props.paymentStatus.refunded &&
                              t("booking_with_payment_cancelled")}
                            {props.paymentStatus.success &&
                              !props.paymentStatus.refunded &&
                              t("booking_with_payment_cancelled_already_paid")}
                            {props.paymentStatus.refunded && t("booking_with_payment_cancelled_refunded")}
                          </h4>
                        )}

                      <div className="border-subtle text-default mt-8 grid grid-cols-3 border-t pt-8 text-left rtl:text-right">
                        {(isCancelled || reschedule) && cancellationReason && (
                          <>
                            <div className="mb-6 font-medium">
                              {isCancelled ? t("reason") : t("reschedule_reason")}
                            </div>
                            <div className="col-span-2 last:mb-0">{cancellationReason}</div>
                          </>
                        )}
                        <div className="font-medium">{t("what")}</div>
                        <div className="col-span-2 mb-6 last:mb-0" data-testid="booking-title">
                          {isRoundRobin ? bookingInfo.title : eventName}
                        </div>
                        <div className="font-medium">{t("when")}</div>
                        <div className="col-span-2 mb-6 last:mb-0">
                          {reschedule && !!formerTime && (
                            <p className="line-through">
                              <RecurringBookings
                                eventType={eventType}
                                duration={calculatedDuration}
                                recurringBookings={props.recurringBookings}
                                allRemainingBookings={allRemainingBookings}
                                date={dayjs(formerTime)}
                                is24h={is24h}
                                isCancelled={isCancelled}
                                tz={tz}
                              />
                            </p>
                          )}
                          <RecurringBookings
                            eventType={eventType}
                            duration={calculatedDuration}
                            recurringBookings={props.recurringBookings}
                            allRemainingBookings={allRemainingBookings}
                            date={date}
                            is24h={is24h}
                            isCancelled={isCancelled}
                            tz={tz}
                          />
                        </div>
                        {(bookingInfo?.user || bookingInfo?.attendees) && (
                          <>
                            <div className="font-medium">{t("who")}</div>
                            <div className="col-span-2 last:mb-0">
                              {bookingInfo?.user && (
                                <div className="mb-3">
                                  <div>
                                    <span data-testid="booking-host-name" className="mr-2">
                                      {bookingInfo.user.name}
                                    </span>
                                    <Badge variant="blue">{t("Host")}</Badge>
                                  </div>
                                  <p className="text-default">
                                    {bookingInfo?.userPrimaryEmail ?? bookingInfo.user.email}
                                  </p>
                                </div>
                              )}
                              {bookingInfo?.attendees.map((attendee) => (
                                <div key={attendee.name + attendee.email} className="mb-3 last:mb-0">
                                  {attendee.name && (
                                    <p data-testid={`attendee-name-${attendee.name}`}>{attendee.name}</p>
                                  )}
                                  <p data-testid={`attendee-email-${attendee.email}`}>{attendee.email}</p>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                        {locationToDisplay && !isCancelled && (
                          <>
                            <div className="mt-3 font-medium">{t("where")}</div>
                            <div className="col-span-2 mt-3" data-testid="where">
                              {!rescheduleLocation || locationToDisplay === rescheduleLocationToDisplay ? (
                                <DisplayLocation
                                  locationToDisplay={locationToDisplay}
                                  providerName={providerName}
                                />
                              ) : (
                                <>
                                  {!!formerTime && (
                                    <DisplayLocation
                                      locationToDisplay={locationToDisplay}
                                      providerName={providerName}
                                      className="line-through"
                                    />
                                  )}

                                  <DisplayLocation
                                    locationToDisplay={rescheduleLocationToDisplay}
                                    providerName={rescheduleProviderName}
                                  />
                                </>
                              )}
                            </div>
                          </>
                        )}
                        {props.paymentStatus && (
                          <>
                            <div className="mt-3 font-medium">
                              {props.paymentStatus.paymentOption === "HOLD"
                                ? t("complete_your_booking")
                                : t("payment")}
                            </div>
                            <div className="col-span-2 mb-2 mt-3">
                              <Price
                                currency={props.paymentStatus.currency}
                                price={props.paymentStatus.amount}
                              />
                            </div>
                          </>
                        )}

                        {rescheduledToUid ? <RescheduledToLink rescheduledToUid={rescheduledToUid} /> : null}

                        {bookingInfo?.description && (
                          <>
                            <div className="mt-9 font-medium">{t("additional_notes")}</div>
                            <div className="col-span-2 mb-2 mt-9">
                              <p className="break-words">{bookingInfo.description}</p>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="text-default grid grid-cols-3 text-left rtl:text-right">
                        {Object.entries(bookingInfo.responses).map(([name, response]) => {
                          const field = eventType.bookingFields.find((field) => field.name === name);
                          // We show location in the "where" section
                          // We show Booker Name, Emails and guests in Who section
                          // We show notes in additional notes section
                          // We show rescheduleReason at the top
                          if (!field) return null;
                          const isSystemField = SystemField.safeParse(field.name);
                          // SMS_REMINDER_NUMBER_FIELD is a system field but doesn't have a dedicated place in the UI. So, it would be shown through the following responses list
                          // TITLE is also an identifier for booking question "What is this meeting about?"
                          if (
                            isSystemField.success &&
                            field.name !== SMS_REMINDER_NUMBER_FIELD &&
                            field.name !== TITLE_FIELD
                          )
                            return null;

                          const label = field.label || t(field.defaultLabel || "");

                          const maskedCPF =
                            field.name === "CPF"
                              ? cpfMask(response.toString() || "").value
                              : response.toString();

                          return (
                            <>
                              <div className="mt-3 font-medium">{label}</div>
                              <p
                                className="col-span-2 mt-3"
                                data-testid="field-response"
                                data-fob-field={field.name}>
                                {field.type === "boolean" ? (response ? t("yes") : t("no")) : maskedCPF}
                              </p>
                            </>
                          );
                        })}
                      </div>
                    </div>
                    {requiresLoginToUpdate && (
                      <>
                        <hr className="border-subtle mb-8" />
                        <div className="text-center">
                          <span className="text-emphasis ltr:mr-2 rtl:ml-2">
                            {t("need_to_make_a_change")}
                          </span>
                          {/* Login button but redirect to here */}
                          <span className="text-default inline">
                            <span className="underline" data-testid="reschedule-link">
                              <Link
                                href={`/auth/login?callbackUrl=${encodeURIComponent(
                                  `/booking/${bookingInfo?.uid}`
                                )}`}
                                legacyBehavior>
                                {t("login")}
                              </Link>
                            </span>
                          </span>
                        </div>
                      </>
                    )}
                    {isCancelableOrRescheduble && !isCancellationMode && (
                      <>
                        <hr className="border-subtle mb-8" />
                        <div className="text-center last:pb-0">
                          <span className="text-emphasis ltr:mr-2 rtl:ml-2">
                            Deseja fazer alguma alteração?
                          </span>
                          <>
                            <span className="text-default inline">
                              <span className="underline" data-testid="reschedule-link">
                                <Link
                                  href={`${rescheduleRoute}?originalBookingId=${
                                    pathname?.split("/booking/")[1].split("?")[0] || ""
                                  }`}
                                  legacyBehavior>
                                  {t("reschedule")}
                                </Link>
                              </span>
                              {!isEventCancelled && !isPastBooking && (
                                <span className="mx-2">{t("or_lowercase")}</span>
                              )}
                            </span>

                            {!isEventCancelled && !isPastBooking && (
                              <button
                                data-testid="cancel"
                                className={classNames(
                                  "text-default underline",
                                  props.recurringBookings && "ltr:mr-2 rtl:ml-2"
                                )}
                                onClick={() => setIsCancellationMode(true)}>
                                {t("cancel")}
                              </button>
                            )}
                          </>
                        </div>
                      </>
                    )}
                    {isCancelableOrRescheduble && isCancellationMode && (
                      <>
                        <hr className="border-subtle" />
                        <CancelBooking
                          booking={{
                            uid: bookingInfo?.uid,
                            title: bookingInfo?.title,
                            id: bookingInfo?.id,
                          }}
                          profile={{ name: props.profile.name, slug: props.profile.slug }}
                          recurringEvent={eventType.recurringEvent}
                          team={eventType?.team?.name}
                          setIsCancellationMode={() => setIsCancellationMode(!isCancellationMode)}
                          theme={isSuccessBookingPage ? props.profile.theme : "light"}
                          allRemainingBookings={allRemainingBookings}
                          seatReferenceUid={seatReferenceUid}
                          bookingCancelledEventProps={bookingCancelledEventProps}
                          currentUserEmail={currentUserEmail}
                        />
                      </>
                    )}
                    {!isCancelled && isRejectionMode && (
                      <>
                        <hr className="border-subtle" />
                        <RejectBooking
                          booking={{
                            id: bookingInfo.id,
                            uid: bookingInfo?.uid,
                            recurringEventId: bookingInfo.recurringEventId,
                          }}
                          setIsRejectionMode={setIsRejectionMode}
                        />
                      </>
                    )}
                    {userIsOwner &&
                      !needsConfirmation &&
                      !isCancellationMode &&
                      isReschedulable &&
                      !!calculatedDuration && (
                        <>
                          <hr className="border-subtle mt-8" />
                          <div className="text-default align-center flex flex-row justify-center pt-8">
                            <span className="text-default flex self-center font-medium ltr:mr-2 rtl:ml-2 ">
                              {t("add_to_calendar")}
                            </span>
                            <div className="justify-left mt-1 flex text-left sm:mt-0">
                              <Link
                                href={`https://calendar.google.com/calendar/r/eventedit?dates=${date
                                  .utc()
                                  .format("YYYYMMDDTHHmmss[Z]")}/${date
                                  .add(calculatedDuration, "minute")
                                  .utc()
                                  .format("YYYYMMDDTHHmmss[Z]")}&text=${eventName}&details=${
                                  eventType.description
                                }${
                                  typeof locationVideoCallUrl === "string"
                                    ? `&location=${encodeURIComponent(locationVideoCallUrl)}`
                                    : ""
                                }${
                                  eventType.recurringEvent
                                    ? `&recur=${encodeURIComponent(
                                        new RRule(eventType.recurringEvent).toString()
                                      )}`
                                    : ""
                                }`}
                                className="text-default border-subtle h-10 w-10 rounded-sm border px-3 py-2 ltr:mr-2 rtl:ml-2">
                                <svg
                                  className="-mt-1.5 inline-block h-4 w-4"
                                  fill="currentColor"
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24">
                                  <title>Google</title>
                                  <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                                </svg>
                              </Link>
                              <Link
                                href={
                                  encodeURI(
                                    `https://outlook.live.com/calendar/0/deeplink/compose?body=${
                                      eventType.description
                                    }&enddt=${date
                                      .add(calculatedDuration, "minute")
                                      .utc()
                                      .format()}&path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&startdt=${date
                                      .utc()
                                      .format()}&subject=${eventName}`
                                  ) +
                                  (locationVideoCallUrl
                                    ? `&location=${encodeURIComponent(locationVideoCallUrl)}`
                                    : "")
                                }
                                className="border-subtle text-default mx-2 h-10 w-10 rounded-sm border px-3 py-2"
                                target="_blank">
                                <svg
                                  className="-mt-1.5 mr-1 inline-block h-4 w-4"
                                  fill="currentColor"
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24">
                                  <title>Microsoft Outlook</title>
                                  <path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.5V2.55q0-.44.3-.75.3-.3.75-.3h12.9q.44 0 .75.3.3.3.3.75V10.85l1.24.72h.01q.1.07.18.18.07.12.07.25zm-6-8.25v3h3v-3zm0 4.5v3h3v-3zm0 4.5v1.83l3.05-1.83zm-5.25-9v3h3.75v-3zm0 4.5v3h3.75v-3zm0 4.5v2.03l2.41 1.5 1.34-.8v-2.73zM9 3.75V6h2l.13.01.12.04v-2.3zM5.98 15.98q.9 0 1.6-.3.7-.32 1.19-.86.48-.55.73-1.28.25-.74.25-1.61 0-.83-.25-1.55-.24-.71-.71-1.24t-1.15-.83q-.68-.3-1.55-.3-.92 0-1.64.3-.71.3-1.2.85-.5.54-.75 1.3-.25.74-.25 1.63 0 .85.26 1.56.26.72.74 1.23.48.52 1.17.81.69.3 1.56.3zM7.5 21h12.39L12 16.08V17q0 .41-.3.7-.29.3-.7.3H7.5zm15-.13v-7.24l-5.9 3.54Z" />
                                </svg>
                              </Link>
                              <Link
                                href={
                                  encodeURI(
                                    `https://outlook.office.com/calendar/0/deeplink/compose?body=${
                                      eventType.description
                                    }&enddt=${date
                                      .add(calculatedDuration, "minute")
                                      .utc()
                                      .format()}&path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&startdt=${date
                                      .utc()
                                      .format()}&subject=${eventName}`
                                  ) +
                                  (locationVideoCallUrl
                                    ? `&location=${encodeURIComponent(locationVideoCallUrl)}`
                                    : "")
                                }
                                className="text-default border-subtle mx-2 h-10 w-10 rounded-sm border px-3 py-2"
                                target="_blank">
                                <svg
                                  className="-mt-1.5 mr-1 inline-block h-4 w-4"
                                  fill="currentColor"
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24">
                                  <title>Microsoft Office</title>
                                  <path d="M21.53 4.306v15.363q0 .807-.472 1.433-.472.627-1.253.85l-6.888 1.974q-.136.037-.29.055-.156.019-.293.019-.396 0-.72-.105-.321-.106-.656-.292l-4.505-2.544q-.248-.137-.391-.366-.143-.23-.143-.515 0-.434.304-.738.304-.305.739-.305h5.831V4.964l-4.38 1.563q-.533.187-.856.658-.322.472-.322 1.03v8.078q0 .496-.248.912-.25.416-.683.651l-2.072 1.13q-.286.148-.571.148-.497 0-.844-.347-.348-.347-.348-.844V6.563q0-.62.33-1.19.328-.571.874-.881L11.07.285q.248-.136.534-.21.285-.075.57-.075.211 0 .38.031.166.031.364.093l6.888 1.899q.384.11.7.329.317.217.547.52.23.305.353.67.125.367.125.764zm-1.588 15.363V4.306q0-.273-.16-.478-.163-.204-.423-.28l-3.388-.93q-.397-.111-.794-.23-.397-.117-.794-.216v19.68l4.976-1.427q.26-.074.422-.28.161-.204.161-.477z" />
                                </svg>
                              </Link>
                              <Link
                                href={`data:text/calendar,${eventLink()}`}
                                className="border-subtle text-default mx-2 h-10 w-10 rounded-sm border px-3 py-2"
                                download={`${eventType.title}.ics`}>
                                <svg
                                  version="1.1"
                                  fill="currentColor"
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 1000 1000"
                                  className="-mt-1.5 mr-1 inline-block h-4 w-4">
                                  <title>{t("other")}</title>
                                  <path d="M971.3,154.9c0-34.7-28.2-62.9-62.9-62.9H611.7c-1.3,0-2.6,0.1-3.9,0.2V10L28.7,87.3v823.4L607.8,990v-84.6c1.3,0.1,2.6,0.2,3.9,0.2h296.7c34.7,0,62.9-28.2,62.9-62.9V154.9z M607.8,636.1h44.6v-50.6h-44.6v-21.9h44.6v-50.6h-44.6v-92h277.9v230.2c0,3.8-3.1,7-7,7H607.8V636.1z M117.9,644.7l-50.6-2.4V397.5l50.6-2.2V644.7z M288.6,607.3c17.6,0.6,37.3-2.8,49.1-7.2l9.1,48c-11,5.1-35.6,9.9-66.9,8.3c-85.4-4.3-127.5-60.7-127.5-132.6c0-86.2,57.8-136.7,133.2-140.1c30.3-1.3,53.7,4,64.3,9.2l-12.2,48.9c-12.1-4.9-28.8-9.2-49.5-8.6c-45.3,1.2-79.5,30.1-79.5,87.4C208.8,572.2,237.8,605.7,288.6,607.3z M455.5,665.2c-32.4-1.6-63.7-11.3-79.1-20.5l12.6-50.7c16.8,9.1,42.9,18.5,70.4,19.4c30.1,1,46.3-10.7,46.3-29.3c0-17.8-14-28.1-48.8-40.6c-46.9-16.4-76.8-41.7-76.8-81.5c0-46.6,39.3-84.1,106.8-87.1c33.3-1.5,58.3,4.2,76.5,11.2l-15.4,53.3c-12.1-5.3-33.5-12.8-62.3-12c-28.3,0.8-41.9,13.6-41.9,28.1c0,17.8,16.1,25.5,53.6,39c52.9,18.5,78.4,45.3,78.4,86.4C575.6,629.7,536.2,669.2,455.5,665.2z M935.3,842.7c0,14.9-12.1,27-27,27H611.7c-1.3,0-2.6-0.2-3.9-0.4V686.2h270.9c19.2,0,34.9-15.6,34.9-34.9V398.4c0-19.2-15.6-34.9-34.9-34.9h-47.1v-32.3H808v32.3h-44.8v-32.3h-22.7v32.3h-43.3v-32.3h-22.7v32.3H628v-32.3h-20.2v-203c1.31.2,2.6-0.4,3.9-0.4h296.7c14.9,0,27,12.1,27,27L935.3,842.7L935.3,842.7z" />
                                </svg>
                              </Link>
                            </div>
                          </div>
                        </>
                      )}
                    {!isEventCancelled && <RescheduleOrCancelWarning description={description} />}
                    {!isEventCancelled && (
                      <div className="mt-4 flex justify-center">
                        <span className=" text-xs">
                          Confira a nossa{" "}
                          <Link
                            className="underline"
                            target="_blank"
                            href="https://www.yinflow.life/discover#politica-de-cancelamento-e-reembolso">
                            política de reagendamentos, cancelamentos e reembolsos.
                          </Link>
                        </span>
                      </div>
                    )}

                    {/* {session === null && !(userIsOwner || props.hideBranding) && (
                      <>
                        <hr className="border-subtle mt-8" />
                        <div className="text-default pt-8 text-center text-xs">
                          <a href="https://cal.com/signup">
                            {t("create_booking_link_with_calcom", { appName: APP_NAME })}
                          </a>

                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const target = e.target as typeof e.target & {
                                email: { value: string };
                              };
                              router.push(`https://cal.com/signup?email=${target.email.value}`);
                            }}
                            className="mt-4 flex">
                            <EmailInput
                              name="email"
                              id="email"
                              defaultValue={email}
                              className="mr- focus:border-brand-default border-default text-default mt-0 block w-full rounded-none rounded-l-md shadow-sm focus:ring-black sm:text-sm"
                              placeholder="rick.astley@cal.com"
                            />
                            <Button
                              size="lg"
                              type="submit"
                              className="min-w-max rounded-none rounded-r-md"
                              color="primary">
                              {t("try_for_free")}
                            </Button>
                          </form>
                        </div>
                      </>
                    )} */}
                  </>
                )}
                {isFeedbackMode &&
                  (noShow ? (
                    <>
                      <EmptyScreen
                        Icon="user-x"
                        iconClassName="text-error"
                        iconWrapperClassName="bg-error"
                        headline={t("host_no_show")}
                        description={t("no_show_description")}
                        buttonRaw={
                          !props.recurringBookings ? (
                            <Button href={`/reschedule/${seatReferenceUid || bookingInfo?.uid}`}>
                              {t("reschedule")}
                            </Button>
                          ) : undefined
                        }
                      />
                    </>
                  ) : (
                    <>
                      <div className="my-3 flex justify-center space-x-1">
                        <button
                          className={classNames(
                            "flex h-10 w-10 items-center justify-center rounded-full border text-2xl hover:opacity-100",
                            rateValue === 1
                              ? "border-focus bg-emphasis"
                              : "border-muted bg-default opacity-50"
                          )}
                          disabled={isFeedbackSubmitted}
                          onClick={() => setRateValue(1)}>
                          😠
                        </button>
                        <button
                          className={classNames(
                            "flex h-10 w-10 items-center justify-center rounded-full border text-2xl hover:opacity-100",
                            rateValue === 2
                              ? "border-focus bg-emphasis"
                              : "border-muted bg-default opacity-50"
                          )}
                          disabled={isFeedbackSubmitted}
                          onClick={() => setRateValue(2)}>
                          🙁
                        </button>
                        <button
                          className={classNames(
                            "flex h-10 w-10 items-center justify-center rounded-full border text-2xl hover:opacity-100",
                            rateValue === 3
                              ? "border-focus bg-emphasis"
                              : " border-muted bg-default opacity-50"
                          )}
                          disabled={isFeedbackSubmitted}
                          onClick={() => setRateValue(3)}>
                          😐
                        </button>
                        <button
                          className={classNames(
                            "flex h-10 w-10 items-center justify-center rounded-full border text-2xl hover:opacity-100",
                            rateValue === 4
                              ? "border-focus bg-emphasis"
                              : "border-muted bg-default opacity-50"
                          )}
                          disabled={isFeedbackSubmitted}
                          onClick={() => setRateValue(4)}>
                          😄
                        </button>
                        <button
                          className={classNames(
                            "flex h-10 w-10 items-center justify-center rounded-full border text-2xl hover:opacity-100",
                            rateValue === 5
                              ? "border-focus bg-emphasis"
                              : "border-muted bg-default opacity-50"
                          )}
                          disabled={isFeedbackSubmitted}
                          onClick={() => setRateValue(5)}>
                          😍
                        </button>
                      </div>
                      <div className="my-4 space-y-1 text-center">
                        <h2 className="font-cal text-lg">{t("submitted_feedback")}</h2>
                        <p className="text-sm">{rateValue < 4 ? t("how_can_we_improve") : t("most_liked")}</p>
                      </div>
                      <TextArea
                        id="comment"
                        name="comment"
                        placeholder="Next time I would like to ..."
                        rows={3}
                        disabled={isFeedbackSubmitted}
                        onChange={(event) => setComment(event.target.value)}
                      />
                      <div className="my-4 flex justify-start">
                        <Button
                          loading={mutation.isPending}
                          disabled={isFeedbackSubmitted}
                          onClick={async () => {
                            if (rating) {
                              await sendFeedback(rating, comment);
                            }
                          }}>
                          {t("submit_feedback")}
                        </Button>
                      </div>
                    </>
                  ))}
              </div>
              {isGmail && !isFeedbackMode && (
                <Alert
                  className="main -mb-20 mt-4 inline-block sm:-mt-4 sm:mb-4 sm:w-full sm:max-w-xl sm:align-middle ltr:text-left rtl:text-right"
                  severity="warning"
                  message={
                    <div>
                      <p className="font-semibold">
                        Para adicionar o evento ao seu Google Calendar, abra o e-mail de confirmação, clique
                        no botão "Adicionar à agenda" e, em seguida, no botão "Sim",{" "}
                        <span className="cursor-pointer underline">
                          <a
                            onClick={() => {
                              setShowModal(true);
                            }}>
                            conforme demonstrado neste vídeo.
                          </a>
                        </span>
                      </p>
                    </div>
                  }
                  CustomIcon="circle-alert"
                  customIconColor="text-attention dark:text-orange-200"
                />
              )}
            </div>
          </div>
        </div>
      </main>
      <Toaster position="bottom-right" />
    </div>
  );
}

const RescheduledToLink = ({ rescheduledToUid }: { rescheduledToUid: string }) => {
  const { t } = useLocale();
  return (
    <>
      <div className="mt-3 font-medium">{t("rescheduled")}</div>
      <div className="col-span-2 mb-2 mt-3">
        <span className="underline">
          <Link href={`/booking/${rescheduledToUid}`}>
            <div className="flex items-center gap-1">
              {t("view_booking")}
              <Icon name="external-link" className="h-4 w-4" />
            </div>
          </Link>
        </span>
      </div>
    </>
  );
};

const DisplayLocation = ({
  locationToDisplay,
  providerName,
  className,
}: {
  locationToDisplay: string;
  providerName?: string;
  className?: string;
}) =>
  locationToDisplay.startsWith("http") ? (
    <a
      href={locationToDisplay}
      target="_blank"
      title={locationToDisplay}
      className={classNames("text-default flex items-center gap-2", className)}
      rel="noreferrer">
      {providerName || "Link"}
      <Icon name="external-link" className="text-default inline h-4 w-4" />
    </a>
  ) : (
    <p className={className}>{locationToDisplay}</p>
  );

Success.isBookingPage = true;
Success.PageWrapper = PageWrapper;

type RecurringBookingsProps = {
  eventType: PageProps["eventType"];
  recurringBookings: PageProps["recurringBookings"];
  date: dayjs.Dayjs;
  duration: number | undefined;
  is24h: boolean;
  allRemainingBookings: boolean;
  isCancelled: boolean;
  tz: string;
};

function RecurringBookings({
  eventType,
  recurringBookings,
  duration,
  date,
  allRemainingBookings,
  is24h,
  isCancelled,
  tz,
}: RecurringBookingsProps) {
  const [moreEventsVisible, setMoreEventsVisible] = useState(false);
  const {
    t,
    i18n: { language },
  } = useLocale();
  const recurringBookingsSorted = recurringBookings
    ? recurringBookings.sort((a: ConfigType, b: ConfigType) => (dayjs(a).isAfter(dayjs(b)) ? 1 : -1))
    : null;

  if (!duration) return null;

  if (recurringBookingsSorted && allRemainingBookings) {
    return (
      <>
        {eventType.recurringEvent?.count && (
          <span className="font-medium">
            {getEveryFreqFor({
              t,
              recurringEvent: eventType.recurringEvent,
              recurringCount: recurringBookings?.length ?? undefined,
            })}
          </span>
        )}
        {eventType.recurringEvent?.count &&
          recurringBookingsSorted.slice(0, 4).map((dateStr: string, idx: number) => (
            <div key={idx} className={classNames("mb-2", isCancelled ? "line-through" : "")}>
              {formatToLocalizedDate(dayjs.tz(dateStr, tz), language, "full", tz)}
              <br />
              {formatToLocalizedTime(dayjs(dateStr), language, undefined, !is24h, tz)} -{" "}
              {formatToLocalizedTime(dayjs(dateStr).add(duration, "m"), language, undefined, !is24h, tz)}{" "}
              <span className="text-bookinglight">
                ({formatToLocalizedTimezone(dayjs(dateStr), language, tz)})
              </span>
            </div>
          ))}
        {recurringBookingsSorted.length > 4 && (
          <Collapsible open={moreEventsVisible} onOpenChange={() => setMoreEventsVisible(!moreEventsVisible)}>
            <CollapsibleTrigger
              type="button"
              className={classNames("flex w-full", moreEventsVisible ? "hidden" : "")}>
              + {t("plus_more", { count: recurringBookingsSorted.length - 4 })}
            </CollapsibleTrigger>
            <CollapsibleContent>
              {eventType.recurringEvent?.count &&
                recurringBookingsSorted.slice(4).map((dateStr: string, idx: number) => (
                  <div key={idx} className={classNames("mb-2", isCancelled ? "line-through" : "")}>
                    {formatToLocalizedDate(dayjs.tz(dateStr, tz), language, "full", tz)}
                    <br />
                    {formatToLocalizedTime(dayjs(dateStr), language, undefined, !is24h, tz)} -{" "}
                    {formatToLocalizedTime(
                      dayjs(dateStr).add(duration, "m"),
                      language,
                      undefined,
                      !is24h,
                      tz
                    )}{" "}
                    <span className="text-bookinglight">
                      ({formatToLocalizedTimezone(dayjs(dateStr), language, tz)})
                    </span>
                  </div>
                ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </>
    );
  }

  return (
    <div className={classNames(isCancelled ? "line-through" : "")}>
      {formatToLocalizedDate(date, language, "full", tz)}
      <br />
      {formatToLocalizedTime(date, language, undefined, !is24h, tz)} -{" "}
      {formatToLocalizedTime(dayjs(date).add(duration, "m"), language, undefined, !is24h, tz)}{" "}
      <span className="text-bookinglight">({formatToLocalizedTimezone(date, language, tz)})</span>
    </div>
  );
}
