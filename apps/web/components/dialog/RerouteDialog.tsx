import { useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useEffect, useCallback } from "react";
import type { z } from "zod";

import FormInputFields, {
  FormInputFieldsSkeleton,
} from "@calcom/app-store/routing-forms/components/FormInputFields";
import { getAbsoluteEventTypeRedirectUrl } from "@calcom/app-store/routing-forms/getEventTypeRedirectUrl";
import { findMatchingRoute } from "@calcom/app-store/routing-forms/lib/processRoute";
import { substituteVariables } from "@calcom/app-store/routing-forms/lib/substituteVariables";
import type { FormResponse, LocalRoute } from "@calcom/app-store/routing-forms/types/types";
import { RouteActionType } from "@calcom/app-store/routing-forms/zod";
import dayjs from "@calcom/dayjs";
import { useBookerUrl } from "@calcom/features/bookings/hooks/useBookerUrl";
import { createBooking } from "@calcom/features/bookings/lib/create-booking";
import { Dialog } from "@calcom/features/components/controlled-dialog";
import { getUrlSearchParamsToForwardForReroute } from "@calcom/features/routing-forms/lib/getUrlSearchParamsToForward";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { EventType, User, Team, Attendee, Booking as PrismaBooking } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";
import type { bookingMetadataSchema } from "@calcom/prisma/zod-utils";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import type { Ensure } from "@calcom/types/utils";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";

const enum ReroutingStatusEnum {
  REROUTING_NOT_INITIATED = "not_initiated",
  REROUTING_IN_PROGRESS = "in_progress",
  REROUTING_COMPLETE = "complete",
  REROUTING_FAILED = "failed",
}

type ResponseWithForm = RouterOutputs["viewer"]["appRoutingForms"]["getResponseWithFormFields"];

type BookingToReroute = Pick<PrismaBooking, "metadata" | "responses" | "id" | "uid" | "title" | "status"> & {
  routedFromRoutingFormReponse: {
    id: number;
  };
  startTime: string;
  metadata: z.infer<typeof bookingMetadataSchema>;
  attendees: Pick<Attendee, "locale" | "timeZone" | "email" | "name">[];
  eventType: Pick<EventType, "length" | "schedulingType" | "title" | "id" | "slug"> & {
    team: Pick<Team, "slug"> | null;
  };
  user: Pick<User, "id" | "name" | "email"> | null;
};

type TeamEventTypeBookingToReroute = Omit<BookingToReroute, "eventType"> & {
  user: NonNullable<BookingToReroute["user"]>;
  eventType: Omit<BookingToReroute["eventType"], "team"> & {
    team: Ensure<Pick<Team, "slug">, "slug">;
  };
};

type RerouteDialogProps = {
  isOpenDialog: boolean;
  setIsOpenDialog: (isOpen: boolean) => void;
  booking: BookingToReroute;
};

type ReroutingState =
  | {
      type: "reschedule_to_same_event_new_tab" | "reschedule_to_different_event_new_tab";
      /**
       * UID of the rescheduled booking
       */
      newBooking: string | null;
      /**
       * window for the new tab that is opened for rerouting
       */
      reschedulerWindow: Window;
      error?: Error;
    }
  | {
      type: "same_timeslot";
      newBooking: string | null;
      reschedulerWindow: null;
      error?: Error;
    };

type TeamMemberMatchingAttributeLogic = {
  id: number;
  name: string | null;
  email: string;
};

// We can't let user change email identifier field as that would require contact owner information from salesforce which we don't support yet.
// Also, this isn't a requirement as well to allow correcting the email
const fieldsThatCannotBeCorrected = ["email"];

function getEventTypeUrlsForTheChosenRoute({
  chosenRoute,
  form,
  reroutingFormResponses,
  currentResponse,
  teamMemberIdsMatchingAttributeLogic,
  booking,
  searchParams,
}: {
  form: ResponseWithForm["form"];
  currentResponse: FormResponse;
  reroutingFormResponses: Record<string, Pick<FormResponse[keyof FormResponse], "value">>;
  teamMemberIdsMatchingAttributeLogic: number[] | null;
  chosenRoute: LocalRoute | null;
  booking: TeamEventTypeBookingToReroute;
  searchParams: URLSearchParams;
}) {
  if (!chosenRoute) {
    return null;
  }

  const formFields = form.fields || [];
  const routedFromRoutingFormReponseId = booking.routedFromRoutingFormReponse.id;

  const allURLSearchParams = getUrlSearchParamsToForwardForReroute({
    formResponse: currentResponse,
    formResponseId: routedFromRoutingFormReponseId,
    fields: formFields,
    searchParams,
    teamMembersMatchingAttributeLogic: teamMemberIdsMatchingAttributeLogic,
    attributeRoutingConfig: chosenRoute.attributeRoutingConfig ?? null,
    rescheduleUid: booking.uid,
    reroutingFormResponses,
  });

  const eventFullSlug = substituteVariables(chosenRoute.action.value, currentResponse, formFields);
  const eventBookingAbsoluteUrl = getAbsoluteEventTypeRedirectUrl({
    form,
    eventTypeRedirectUrl: eventFullSlug,
    allURLSearchParams,
    isEmbed: false,
  });

  return { eventFullSlug, eventBookingAbsoluteUrl };
}

function rescheduleInNewTab({ url }: { url: string }) {
  const reschedulerWindow = window.open(url, "_blank");

  if (!reschedulerWindow) {
    throw new Error("Failed to open new tab");
  }

  return reschedulerWindow;
}

const getFullSlugForEvent = (
  eventType: Pick<TeamEventTypeBookingToReroute["eventType"], "team" | "slug">
) => {
  return `team/${eventType.team.slug}/${eventType.slug}`;
};

function isBookingTimeslotInPast(booking: BookingToReroute) {
  return dayjs(booking.startTime).isBefore(dayjs());
}

const useReroutingState = ({ isOpenDialog }: Pick<RerouteDialogProps, "isOpenDialog">) => {
  const [value, setValue] = useState<ReroutingState | null>(null);
  const state = value;

  // If dialog is closed but the rerouting window is still open, close it
  if (!isOpenDialog && state?.reschedulerWindow) {
    state.reschedulerWindow.close();
    setValue(null);
  }

  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (state?.reschedulerWindow?.closed) {
        // Ensure that render happens again
        setValue(null);
        clearInterval(checkInterval);
      }
    }, 1);

    return () => clearInterval(checkInterval);
  }, [value, setValue]);

  const status = (() => {
    if (!value) return ReroutingStatusEnum.REROUTING_NOT_INITIATED;
    if (value.error) return ReroutingStatusEnum.REROUTING_FAILED;
    if (!!value.newBooking) return ReroutingStatusEnum.REROUTING_COMPLETE;
    return ReroutingStatusEnum.REROUTING_IN_PROGRESS;
  })();

  return { value: state, setValue, status };
};

// const useUpdateIsReroutingQueryParam = ({ isOpenDialog }: { isOpenDialog: boolean }) => {
//   const { setQuery: setIsReroutingQuery } = useRouterQuery("isRerouting");
//   useEffect(() => {
//     if (isOpenDialog) {
//       setIsReroutingQuery("true");
//     } else {
//       setIsReroutingQuery(undefined);
//     }
//   }, [isOpenDialog]);
// };

const gotoBookingPage = ({
  booking,
  router,
}: {
  booking: Pick<PrismaBooking, "uid">;
  router: ReturnType<typeof useRouter>;
}) => {
  // TODO: Do we need to send other params as well?
  router.push(`/booking/${booking.uid}?cal.rerouting=true`);
};

const useEventListeners = ({ reroutingState }: { reroutingState: ReturnType<typeof useReroutingState> }) => {
  const router = useRouter();
  const { t } = useLocale();
  const messageListener = useCallback(
    (event: MessageEvent) => {
      if (event.data.type !== "CAL:rescheduleBookingSuccessfulV2") {
        return;
      }
      const calEventData = event.data.data;
      showToast(t("rerouted_booking_successfully_redirecting_to_booking_page"), "success");
      if (!calEventData.uid) {
        console.error("Booking UID is not there");
        throw new Error(t("something_went_wrong"));
      }
      const newBookingId = calEventData.uid;
      reroutingState.setValue((prev) => {
        if (!prev) return null;
        return { ...prev, newBooking: newBookingId };
      });
      gotoBookingPage({ router, booking: { uid: newBookingId } });
      reroutingState.value?.reschedulerWindow?.close();
    },
    [reroutingState, reroutingState.value?.reschedulerWindow]
  );

  // Make sure to close the rescheduler window when this tab closes/reloads
  const beforeUnloadListener = useCallback(() => {
    reroutingState.value?.reschedulerWindow?.close();
    reroutingState.setValue(null);
  }, [reroutingState.value?.reschedulerWindow]);

  // Ensure listeners are added once the component is mounted and removed once the component is unmounted
  useEffect(() => {
    window.addEventListener("message", messageListener);
    window.addEventListener("beforeunload", beforeUnloadListener);
    return () => {
      window.removeEventListener("message", messageListener);
      window.removeEventListener("beforeunload", beforeUnloadListener);
    };
    // messageListener and beforeUnloadListener are memoized using useCallback, so the reference remains stable
  }, [messageListener, beforeUnloadListener]);
};

const NewRoutingManager = ({
  chosenRoute,
  booking,
  form,
  currentResponse,
  teamMembersMatchingAttributeLogic,
  reroutingState,
}: {
  chosenRoute: LocalRoute;
  booking: TeamEventTypeBookingToReroute;
  form: ResponseWithForm["form"];
  currentResponse: FormResponse;
  teamMembersMatchingAttributeLogic: {
    isPending: boolean;
    data: TeamMemberMatchingAttributeLogic[] | null;
  };
  reroutingState: ReturnType<typeof useReroutingState>;
}) => {
  const { t } = useLocale();
  const router = useRouter();
  const bookerUrl = useBookerUrl();
  const session = useSession();
  const teamMemberIdsMatchingAttributeLogic =
    teamMembersMatchingAttributeLogic?.data
      ?.map((member) => member.id)
      .filter((id) => {
        // We don't want to reroute to the same user who booked the booking
        return id !== booking.user?.id;
      }) || null;
  const routedFromRoutingFormReponseId = booking.routedFromRoutingFormReponse.id;

  const bookingEventType = booking.eventType;

  // Provide a reason for rescheduling that can be customized by user in the future
  // const rescheduleReason = "Rerouted";
  const isRoundRobinScheduling = bookingEventType.schedulingType === SchedulingType.ROUND_ROBIN;
  const reroutingFormResponses = Object.fromEntries(
    Object.entries(currentResponse).map(([key, response]) => [key, { value: response.value }])
  );

  const chosenEventUrls = getEventTypeUrlsForTheChosenRoute({
    chosenRoute,
    form,
    reroutingFormResponses,
    teamMemberIdsMatchingAttributeLogic,
    booking,
    currentResponse,
    searchParams: new URLSearchParams({
      rescheduledBy: session?.data?.user?.email ?? "",
    }),
  });

  const chosenEventTypeId = chosenRoute.action.eventTypeId;
  const enableChosenEventTypeQuery = !!chosenEventTypeId;
  // TODO: Get bare minimum eventType details
  const { data: chosenEventTypeData, isPending: isChosenEventTypePending } =
    trpc.viewer.eventTypes.get.useQuery(
      // enabled prop ensures that the query is not run if the chosenEventTypeId is not there
      { id: chosenEventTypeId! },
      {
        enabled: enableChosenEventTypeQuery,
      }
    );

  // isPending of the query is true even if enabled=false and no request was sent. So, identify if the request is actually in progress
  const isChosenEventTypeRequestInProgress = enableChosenEventTypeQuery ? isChosenEventTypePending : false;

  const chosenEventType = chosenEventTypeData?.eventType;

  const currentBookingEventFullSlug = getFullSlugForEvent(booking.eventType);
  const isReroutingToDifferentEvent = currentBookingEventFullSlug !== chosenEventUrls?.eventFullSlug;

  const createBookingMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: (booking) => {
      showToast(t("rerouted_booking_successfully_redirecting_to_booking_page"), "success");
      if (!booking.uid) {
        console.error("Booking UID is not there");
        throw new Error(t("something_went_wrong"));
      }

      const newBookingId = booking.uid;
      reroutingState.setValue((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          newBooking: newBookingId,
        };
      });
      gotoBookingPage({ router, booking: { uid: newBookingId } });
    },
    onError: (err, _, ctx) => {
      reroutingState.setValue({
        error: err,
        newBooking: null,
        type: "same_timeslot",
        reschedulerWindow: null,
      });
      showToast(
        "Looks like the timeslot is not available for the new team members. Try rescheduling with different timeslot",
        "error"
      );
    },
  });

  useEventListeners({ reroutingState });

  if (!chosenRoute) return null;

  const isReroutingInNewTab =
    reroutingState.value?.type === "reschedule_to_same_event_new_tab" ||
    reroutingState.value?.type === "reschedule_to_different_event_new_tab";

  return (
    <div className="bg-muted flex flex-col space-y-3 rounded-md p-4 text-sm">
      <h2 className="text-emphasis font-medium">{t("new_routing_status")}</h2>
      <div className="flex flex-col space-y-2">
        {reroutingState.status === ReroutingStatusEnum.REROUTING_NOT_INITIATED && reroutingPreview()}
        {(reroutingState.status === ReroutingStatusEnum.REROUTING_NOT_INITIATED || !isReroutingInNewTab) &&
          reroutingCTAs()}
        {isReroutingInNewTab && newTabReroutingStatus()}
      </div>
    </div>
  );

  function rescheduleToSameTimeslotOfEvent({
    eventType: { id: eventTypeId, slug: eventTypeSlug, team: eventTypeTeam, length: eventTypeLength },
  }: {
    eventType: Pick<TeamEventTypeBookingToReroute["eventType"], "id" | "slug" | "length"> & {
      team: {
        slug: string | null;
      } | null;
    };
  }) {
    if (!chosenRoute) {
      console.error("Chosen route must be there for rerouting");
      throw new Error(t("something_went_wrong"));
    }

    if (!eventTypeTeam?.slug) {
      console.error("Event type team slug must be there for rerouting");
      throw new Error(t("something_went_wrong"));
    }

    const teamSlug = eventTypeTeam.slug;

    if (isBookingTimeslotInPast(booking)) {
      showToast("You cannot reschedule to a past timeslot", "error");
      return;
    }
    const booker = booking.attendees[0];
    const getFieldsThatRemainSame = () => {
      return {
        responses: booking.responses,
        timeZone: booker.timeZone,
        language: booker.locale || "en",
        metadata: booking.metadata || {},
        ...getBookingSeatFields(),
        ...getHashedLinkFields(),
      };

      function getBookingSeatFields() {
        // During rerouting, do all the seats need to be re-routed?
        // Let's not support re-routing for booking with seats for now.
        return {
          // bookingUid: booking.uid,
          // seatReferenceUid: booking.eventType,
        };
      }

      function getHashedLinkFields() {
        // After booking hashedLink is deleted, so I don't believe we need to return anything here.
        // Also, Rerouting is for a booking that was routed and routing doesn't involve hashed link even if it is enabled for the event.
        return {};
      }
    };

    const getFieldFromEventTypeThatRemainSame = () => {
      return {
        user: teamSlug,
        eventTypeId: eventTypeId,
        eventTypeSlug: eventTypeSlug,
      };
    };

    const getTimeslotFields = () => {
      return {
        // It is possible that EvenType changed its duration, so we would consider that as well.
        start: dayjs(booking.startTime).format(),
        end: dayjs(booking.startTime)
          // Defaults to the default event length in case no custom duration is set.
          .add(eventTypeLength, "minute")
          .format(),
      };
    };

    const getRoutingFormRelatedFields = () => {
      return {
        routedTeamMemberIds: teamMemberIdsMatchingAttributeLogic,
        routingFormResponseId: routedFromRoutingFormReponseId,
        skipContactOwner: chosenRoute.attributeRoutingConfig?.skipContactOwner,
      };
    };

    const getSalesforceContactOwnerFields = () => {
      // Email field won't need to be corrected, so we don't need to support it.
      return {};
    };

    // TODO: Long term, we should refactor handleNewBooking and use a different route specific for this purpose,
    createBookingMutation.mutate({
      rescheduleUid: booking.uid,
      rescheduledBy: session?.data?.user?.email ?? undefined,
      // rescheduleReason,
      reroutingFormResponses: reroutingFormResponses,
      ...getTimeslotFields(),
      ...getFieldsThatRemainSame(),
      ...getFieldFromEventTypeThatRemainSame(),
      ...getRoutingFormRelatedFields(),
      ...getSalesforceContactOwnerFields(),
    });

    reroutingState.setValue({
      newBooking: null,
      type: "same_timeslot",
      reschedulerWindow: null,
    });
  }

  function rescheduleToSameTimeslotOfSameEvent() {
    return rescheduleToSameTimeslotOfEvent({
      eventType: booking.eventType,
    });
  }

  function rescheduleToSameTimeslotOfChosenEvent() {
    if (!chosenEventTypeId && isReroutingToDifferentEvent) {
      showToast(
        "We don't have ID for the new event. Please go to the Routing Form and save it again.",
        "error"
      );
      return;
    }
    if (!chosenEventType) {
      // There are disabled/loading state on button to ensure that this function is not called if chosenEventType is not there
      console.error("Chosen event type must be there for rerouting");
      throw new Error(t("something_went_wrong"));
    }

    return rescheduleToSameTimeslotOfEvent({
      eventType: chosenEventType,
    });
  }

  function rescheduleSameEventInNewTab() {
    if (!chosenEventUrls?.eventBookingAbsoluteUrl) {
      console.error("URL must be there for opening new tab");
      throw new Error(t("something_went_wrong"));
    }

    const reschedulerWindow = rescheduleInNewTab({
      url: chosenEventUrls.eventBookingAbsoluteUrl,
    });

    reroutingState.setValue({
      type: "reschedule_to_same_event_new_tab",
      reschedulerWindow,
      newBooking: null,
    });
  }

  function rescheduleDifferentEventInNewTab() {
    if (!chosenEventUrls?.eventBookingAbsoluteUrl) {
      console.error("URL must be there for opening new tab");
      throw new Error(t("something_went_wrong"));
    }
    const reschedulerWindow = rescheduleInNewTab({
      url: chosenEventUrls.eventBookingAbsoluteUrl,
    });

    reroutingState.setValue({
      type: "reschedule_to_different_event_new_tab",
      reschedulerWindow,
      newBooking: null,
    });
  }

  function reroutingPreview() {
    if (chosenRoute.action.type === RouteActionType.CustomPageMessage) {
      return <span className="text-attention">{t("reroute_preview_custom_message")}</span>;
    }
    if (chosenRoute.action.type === RouteActionType.ExternalRedirectUrl) {
      return (
        <span className="text-attention">
          {t("reroute_preview_external_redirect", { externalUrl: chosenRoute.action.value })}
        </span>
      );
    }
    if (chosenRoute.action.type === RouteActionType.EventTypeRedirectUrl) {
      // Computed value for eventTypeSlugToRedirect
      const eventTypeSlugToRedirect =
        chosenRoute.action.type === RouteActionType.EventTypeRedirectUrl ? chosenRoute.action.value : null;

      if (!eventTypeSlugToRedirect) {
        console.error("Event type slug to redirect must be there if action is EventTypeRedirectUrl");
        throw new Error(t("something_went_wrong"));
      }
      return (
        <div className="flex flex-col space-y-2">
          <span className="text-default" data-testid="reroute-preview-event-type">
            <span className="font-semibold">{t("event_type")}:</span>{" "}
            <a
              className="underline"
              target="_blank"
              href={`${bookerUrl}/${eventTypeSlugToRedirect}`}
              rel="noreferrer"
              data-testid="test-routing-result">
              {eventTypeSlugToRedirect}
            </a>
          </span>
          <span className="text-default" data-testid="reroute-preview-hosts">
            <Tooltip content="Includes fixed hosts always and assumes that all the team members mentioned here are assigned to the event">
              <span className="font-semibold">
                {isRoundRobinScheduling ? t("reroute_preview_possible_host") : t("hosts")}:
              </span>
            </Tooltip>{" "}
            {bookingHosts()}
          </span>
        </div>
      );
    }

    function bookingHosts() {
      if (teamMembersMatchingAttributeLogic.isPending) return t("loading");

      const hostEmails = teamMembersMatchingAttributeLogic.data?.map((member) => member.email).join(", ");
      return hostEmails || t("no_matching_members");
    }
    return null;
  }

  function reroutingCTAs() {
    if (chosenRoute.action.type !== RouteActionType.EventTypeRedirectUrl) {
      // There are no actions to perform if the new chosen route isn't an event type redirect
      return null;
    }
    const shouldDisableCTAs = teamMembersMatchingAttributeLogic.isPending || createBookingMutation.isPending;
    return (
      <div className="flex flex-col gap-2">
        {!isReroutingToDifferentEvent ? (
          <Button onClick={rescheduleSameEventInNewTab} disabled={shouldDisableCTAs}>
            {t("reschedule_with_different_timeslot")}
          </Button>
        ) : (
          <Button onClick={rescheduleDifferentEventInNewTab} disabled={shouldDisableCTAs}>
            {t("reschedule_to_the_new_event_with_different_timeslot")}
          </Button>
        )}
        {!isReroutingToDifferentEvent ? (
          <Button
            disabled={shouldDisableCTAs}
            loading={createBookingMutation.isPending}
            onClick={rescheduleToSameTimeslotOfSameEvent}>
            {t("reschedule_with_same_timeslot")}
          </Button>
        ) : (
          <Button
            disabled={shouldDisableCTAs}
            loading={createBookingMutation.isPending || isChosenEventTypeRequestInProgress}
            onClick={rescheduleToSameTimeslotOfChosenEvent}>
            {t("reschedule_with_same_timeslot_of_new_event")}
          </Button>
        )}
      </div>
    );
  }

  function newTabReroutingStatus() {
    if (reroutingState.status !== ReroutingStatusEnum.REROUTING_IN_PROGRESS) {
      return null;
    }
    return (
      <div>
        <span className="text-attention">
          <span>Continue with rerouting in the new</span>{" "}
          <a
            href="javascript:void(0)"
            className="text-attention underline"
            onClick={() => reroutingState.value?.reschedulerWindow?.focus()}>
            tab
          </a>
        </span>
      </div>
    );
  }
};

const CurrentRoutingStatus = ({
  booking,
}: {
  booking: Pick<TeamEventTypeBookingToReroute, "eventType" | "user" | "attendees">;
}) => {
  const fullSlug = getFullSlugForEvent(booking.eventType);
  const { t } = useLocale();
  const bookerUrl = useBookerUrl();
  if (!fullSlug) return null;
  return (
    <div className="bg-muted flex flex-col space-y-3 rounded-md p-4 text-sm">
      <h2 className="text-emphasis font-medium">{t("current_routing_status")}</h2>
      <div className="flex flex-col space-y-2">
        <span className="text-default" data-testid="current-routing-status-event-type">
          <span className="font-semibold">{t("event_type")}:</span>{" "}
          <a
            className="underline"
            target="_blank"
            href={`${bookerUrl}/${fullSlug}`}
            rel="noreferrer"
            data-testid="test-routing-result">
            {fullSlug}
          </a>
        </span>
        <span className="text-default" data-testid="current-routing-status-organizer">
          <span className="font-semibold">{t("organizer")}:</span> <span>{booking.user.email}</span>
        </span>
        <span className="text-default" data-testid="current-routing-status-attendees">
          <span className="font-semibold">{t("attendees")}:</span>{" "}
          <span>{booking.attendees.map((attendee) => attendee.email).join(", ")}</span>
        </span>
      </div>
    </div>
  );
};

const RerouteDialogContentAndFooter = ({
  booking,
  isOpenDialog,
  setIsOpenDialog,
}: Pick<RerouteDialogProps, "isOpenDialog" | "setIsOpenDialog"> & {
  booking: TeamEventTypeBookingToReroute;
}) => {
  const {
    data: responseWithForm,
    isPending: isRoutingFormLoading,
    error: formResponseFetchError,
  } = trpc.viewer.appRoutingForms.getResponseWithFormFields.useQuery({
    formResponseId: booking.routedFromRoutingFormReponse.id,
  });

  const { t } = useLocale();

  if (isRoutingFormLoading)
    return (
      <>
        <FormInputFieldsSkeleton />
        <DialogFooter>
          <Button color="secondary" onClick={() => setIsOpenDialog(false)}>
            {t("cancel")}
          </Button>
          <Button disabled data-testid="verify-new-route-button">
            {t("verify_new_route")}
          </Button>
        </DialogFooter>
      </>
    );

  if (formResponseFetchError) {
    return <div className="mb-8">{formResponseFetchError.message}</div>;
  }

  if (!responseWithForm) return <div className="mb-8">{t("something_went_wrong")}</div>;

  return (
    <RerouteDialogContentAndFooterWithFormResponse
      isOpenDialog={isOpenDialog}
      setIsOpenDialog={setIsOpenDialog}
      responseWithForm={responseWithForm}
      booking={booking}
    />
  );
};

const RerouteDialogContentAndFooterWithFormResponse = ({
  responseWithForm,
  booking,
  isOpenDialog,
  setIsOpenDialog,
}: Pick<RerouteDialogProps, "isOpenDialog" | "setIsOpenDialog"> & {
  responseWithForm: ResponseWithForm;
  booking: TeamEventTypeBookingToReroute;
}) => {
  const form = responseWithForm.form;
  const { t } = useLocale();
  const router = useRouter();
  const [responseFromOrganizer, setResponseFromOrganizer] = useState<FormResponse>({});
  const isResponseFromOrganizerUnpopulated = Object.keys(responseFromOrganizer).length === 0;
  const currentResponse = isResponseFromOrganizerUnpopulated
    ? responseWithForm.response
    : responseFromOrganizer;
  const [chosenRoute, setChosenRoute] = useState<LocalRoute | null>(null);

  const reroutingState = useReroutingState({
    isOpenDialog,
  });

  const [teamMembersMatchingAttributeLogic, setTeamMembersMatchingAttributeLogic] = useState<
    | {
        id: number;
        name: string | null;
        email: string;
      }[]
    | null
  >([]);

  const findTeamMembersMatchingAttributeLogicMutation =
    trpc.viewer.routingForms.findTeamMembersMatchingAttributeLogicOfRoute.useMutation({
      onSuccess(data) {
        setTeamMembersMatchingAttributeLogic(data.result ? data.result.users : data.result);
      },
    });

  function verifyRoute() {
    // Reset all states
    reroutingState.setValue(null);
    setTeamMembersMatchingAttributeLogic(null);

    const route = findMatchingRoute({
      form,
      response: currentResponse,
    });

    setChosenRoute(route || null);

    if (!route) return;

    findTeamMembersMatchingAttributeLogicMutation.mutate({
      formId: form.id,
      response: currentResponse,
      route,
    });
  }

  return (
    <div>
      <div>
        <Link
          className="text-emphasis text-semibold font-cal mb-4 flex underline"
          href={`/apps/routing-forms/form-edit/${form.id}`}
          target="_blank">
          {form.name}
        </Link>
        <FormInputFields
          response={currentResponse}
          disabledFields={fieldsThatCannotBeCorrected}
          form={form}
          setResponse={setResponseFromOrganizer}
        />
        <div className="flex flex-col gap-2">
          <CurrentRoutingStatus booking={booking} />
          {chosenRoute && (
            <NewRoutingManager
              chosenRoute={chosenRoute}
              booking={booking}
              teamMembersMatchingAttributeLogic={{
                isPending: findTeamMembersMatchingAttributeLogicMutation.isPending,
                data: teamMembersMatchingAttributeLogic,
              }}
              reroutingState={reroutingState}
              form={form}
              currentResponse={currentResponse}
            />
          )}
        </div>
      </div>
      {renderFooter()}
    </div>
  );

  function renderFooter() {
    if (reroutingState.status !== ReroutingStatusEnum.REROUTING_COMPLETE) {
      return (
        <DialogFooter>
          <Button color="secondary" onClick={() => setIsOpenDialog(false)}>
            {t("cancel")}
          </Button>
          <Button
            onClick={verifyRoute}
            data-testid="verify-new-route-button"
            disabled={reroutingState.status === ReroutingStatusEnum.REROUTING_IN_PROGRESS}>
            {t("verify_new_route")}
          </Button>
        </DialogFooter>
      );
    }

    if (reroutingState.status === ReroutingStatusEnum.REROUTING_COMPLETE) {
      return (
        <DialogFooter>
          <Button
            onClick={() => {
              setIsOpenDialog(false);
            }}>
            {t("close")}
          </Button>
        </DialogFooter>
      );
    }
    return null;
  }
};

export const RerouteDialog = ({ isOpenDialog, setIsOpenDialog, booking }: RerouteDialogProps) => {
  const { t } = useLocale();
  const bookingEventType = booking.eventType;

  if (!bookingEventType.team) {
    console.error("Only team event can be re-routed");
    throw new Error(t("something_went_wrong"));
  }

  if (!bookingEventType.team.slug) {
    console.error("Team slug must be there for rerouting");
    throw new Error(t("something_went_wrong"));
  }

  if (!booking.user) {
    // Not a hard requirement, but better to be strict with data.
    console.error("Booking must have a user");
    throw new Error(t("something_went_wrong"));
  }

  const teamEventTypeBooking = {
    ...booking,
    user: booking.user,
    eventType: {
      ...bookingEventType,
      team: {
        ...bookingEventType.team,
        slug: bookingEventType.team.slug,
      },
    },
  };

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent preventCloseOnOutsideClick>
        <DialogHeader title={t("reroute_booking")} subtitle={t("reroute_booking_description")} />
        <RerouteDialogContentAndFooter
          booking={teamEventTypeBooking}
          isOpenDialog={isOpenDialog}
          setIsOpenDialog={setIsOpenDialog}
        />
      </DialogContent>
    </Dialog>
  );
};
