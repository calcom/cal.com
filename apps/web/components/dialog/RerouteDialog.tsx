import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useEffect, useCallback } from "react";
import type { z } from "zod";

import FormInputFields from "@calcom/app-store/routing-forms/components/FormInputFields";
import { getAbsoluteEventTypeRedirectUrl } from "@calcom/app-store/routing-forms/getEventTypeRedirectUrl";
import { findMatchingRoute } from "@calcom/app-store/routing-forms/lib/processRoute";
import { substituteVariables } from "@calcom/app-store/routing-forms/lib/substituteVariables";
import { getUrlSearchParamsToForwardForReroute } from "@calcom/app-store/routing-forms/pages/routing-link/getUrlSearchParamsToForward";
import type { FormResponse, LocalRoute } from "@calcom/app-store/routing-forms/types/types";
import dayjs from "@calcom/dayjs";
import { createBooking } from "@calcom/features/bookings/lib/create-booking";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { EventType, User, Team, Attendee, Booking as PrismaBooking } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";
import type { bookingMetadataSchema } from "@calcom/prisma/zod-utils";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui";
import { Button } from "@calcom/ui";
import { showToast } from "@calcom/ui/components/toast";

type ResponseWithForm = RouterOutputs["viewer"]["appRoutingForms"]["getResponseWithFormFields"];

type Booking = Pick<PrismaBooking, "metadata" | "responses" | "id" | "uid" | "title" | "status"> & {
  startTime: string;
  metadata: z.infer<typeof bookingMetadataSchema>;
  hashedLink: string;
  seatReferenceUid: string;
  attendees: Pick<Attendee, "locale" | "timeZone" | "email" | "name">[];
  eventType: Pick<EventType, "length" | "schedulingType" | "title" | "id" | "slug"> & {
    users: Pick<User, "username">[];
    team: Pick<Team, "slug"> | null;
  };
  user: Pick<User, "id" | "name" | "email"> | null;
};

type RerouteDialogProps = {
  isOpenDialog: boolean;
  setIsOpenDialog: (isOpen: boolean) => void;
  onReroute: () => void;
  routedFromRoutingFormReponseId: number;
  booking: Booking;
};

type ReroutingState = {
  newBooking: string;
  reschedulerWindow: Window;
};

type TeamMemberMatchingAttributeLogic = {
  id: number;
  name: string | null;
  email: string;
};

function rebookInNewTab({
  form,
  response,
  routedFromRoutingFormReponseId,
  teamMemberIdsMatchingAttributeLogic,
  chosenRoute,
  booking,
  bookingEventTypeSlug,
  setReroutingState,
}: {
  response: FormResponse;
  routedFromRoutingFormReponseId: number;
  form: ResponseWithForm["form"];
  teamMemberIdsMatchingAttributeLogic: number[] | null;
  chosenRoute: LocalRoute;
  booking: Booking;
  bookingEventTypeSlug: string | null;
  setReroutingState: React.Dispatch<React.SetStateAction<ReroutingState | null>>;
}) {
  const formFields = form.fields || [];
  const allURLSearchParams = getUrlSearchParamsToForwardForReroute({
    formResponse: response,
    formResponseId: routedFromRoutingFormReponseId,
    fields: formFields,
    searchParams: new URLSearchParams(window.location.search),
    teamMembersMatchingAttributeLogic: teamMemberIdsMatchingAttributeLogic,
    attributeRoutingConfig: chosenRoute?.attributeRoutingConfig ?? null,
    rescheduleUid: booking.uid,
  });

  const eventTypeUrlWithResolvedVariables = substituteVariables(
    chosenRoute.action.value,
    response,
    formFields
  );

  if (bookingEventTypeSlug !== eventTypeUrlWithResolvedVariables) {
    showToast(
      "Rerouting to a different event type is not supported yet. It would require cancelling the current booking and creating a new one.",
      "error"
    );
    return;
  }

  const url = getAbsoluteEventTypeRedirectUrl({
    form,
    eventTypeRedirectUrl: eventTypeUrlWithResolvedVariables,
    allURLSearchParams,
    isEmbed: false,
  });

  const reschedulerWindow = window.open(url, "_blank");
  if (!reschedulerWindow) {
    throw new Error("Failed to open new tab");
  }
  setReroutingState((prev) => {
    if (!prev) return null;
    return {
      ...prev,
      reschedulerWindow,
    };
  });
}

const NewRoutingManager = ({
  chosenRoute,
  eventTypeSlugToRedirect,
  bookingEventType,
  isCreateBookingMutationPending,
  teamMembersMatchingAttributeLogic,
  reroutingState,
  rebookInNewTab,
  rescheduleToSameTimeslotOfSameEvent,
  setIsOpenDialog,
}: Pick<RerouteDialogProps, "setIsOpenDialog"> & {
  chosenRoute: any;
  eventTypeSlugToRedirect: string;
  bookingEventType: Booking["eventType"];
  isCreateBookingMutationPending: boolean;
  teamMembersMatchingAttributeLogic: {
    isPending: boolean;
    data: TeamMemberMatchingAttributeLogic[] | null;
  };
  reroutingState: ReroutingState | null;
  rebookInNewTab: () => void;
  rescheduleToSameTimeslotOfSameEvent: () => void;
}) => {
  const { t } = useLocale();

  if (!chosenRoute) return null;

  const isCustomPageMessage = chosenRoute.action.type === "customPageMessage";
  const isExternalRedirect = chosenRoute.action.type === "externalRedirectUrl";
  const isEventTypeRedirect = chosenRoute.action.type === "eventTypeRedirectUrl";
  const isRoundRobinScheduling = bookingEventType.schedulingType === SchedulingType.ROUND_ROBIN;
  const isReroutingInProgress = !reroutingState?.newBooking && !reroutingState?.reschedulerWindow;
  const isReroutingComplete = !!reroutingState?.newBooking;
  const isReroutingInNewTab = !!reroutingState?.reschedulerWindow;

  const renderActionMessage = () => {
    if (isCustomPageMessage) {
      return <span>It results in showing custom message. Try changing the form to route to an event</span>;
    }
    if (isExternalRedirect) {
      return (
        <span>
          It results in redirecting to {chosenRoute.action.value}. Try changing the form to route to an event
        </span>
      );
    }
    if (isEventTypeRedirect) {
      return (
        <div className="flex flex-col space-y-2">
          <span className="text-default">
            <span className="font-semibold">{t("event_type")}:</span>{" "}
            <a
              className="underline"
              target="_blank"
              href={eventTypeSlugToRedirect}
              rel="noreferrer"
              data-testid="test-routing-result">
              {eventTypeSlugToRedirect}
            </a>
          </span>
          <span className="text-default">
            <span className="font-semibold">{isRoundRobinScheduling ? "Possible host" : t("Hosts")}:</span>
            {renderBookingHosts()}
          </span>
        </div>
      );
    }

    function renderBookingHosts() {
      if (teamMembersMatchingAttributeLogic.isPending) return t("loading");

      const hostEmails = teamMembersMatchingAttributeLogic.data?.map((member) => member.email).join(", ");
      return hostEmails || t("no_matching_members");
    }
    return null;
  };

  const renderReroutingActions = () => {
    if (!isReroutingInProgress) return null;

    return (
      <div className="flex flex-col gap-2">
        <Button
          onClick={rebookInNewTab}
          disabled={teamMembersMatchingAttributeLogic.isPending || isCreateBookingMutationPending}>
          {t("Reschedule with different timeslot")}
        </Button>
        <Button
          disabled={teamMembersMatchingAttributeLogic.isPending || isCreateBookingMutationPending}
          loading={isCreateBookingMutationPending}
          onClick={rescheduleToSameTimeslotOfSameEvent}>
          Reschedule with same timeslot
        </Button>
      </div>
    );
  };

  const renderReroutingResult = () => {
    if (isReroutingInNewTab) {
      return (
        <div>
          <span className="text-attention">Continue with rerouting in the new</span>{" "}
          <a
            href="javascript:void(0)"
            className="text-attention underline"
            onClick={() => reroutingState?.reschedulerWindow?.focus()}>
            tab
          </a>
        </div>
      );
    }
    if (isReroutingComplete) {
      return (
        <div className="flex flex-col">
          <span>
            You have successfully rerouted the booking. Here is the new booking link:{" "}
            <a
              href={`/booking/${reroutingState.newBooking}`}
              className="underline"
              target="_blank"
              rel="noreferrer">
              {`/booking/${reroutingState.newBooking}`}
            </a>
          </span>
          <div>
            You can{" "}
            <a href="javascript:void(0)" className="underline" onClick={() => setIsOpenDialog(false)}>
              close
            </a>{" "}
            this dialog now.
          </div>
        </div>
      );
    }
  };

  return (
    <div className="bg-muted flex flex-col space-y-3 rounded-md p-4 text-sm">
      <h2 className="text-emphasis font-medium">{t("new_routing_status")}</h2>
      <div className="flex flex-col space-y-2">
        {renderActionMessage()}
        {renderReroutingActions()}
        {renderReroutingResult()}
      </div>
    </div>
  );
};

const CurrentRoutingStatus = ({
  booking,
  bookingEventTypeSlug,
}: {
  booking: Booking;
  bookingEventTypeSlug: string | null;
}) => {
  if (!bookingEventTypeSlug) return null;

  return (
    <div className="bg-muted flex flex-col space-y-3 rounded-md p-4 text-sm">
      <h2 className="text-emphasis font-medium">Current Routing Status</h2>
      <div className="flex flex-col space-y-2">
        <span className="text-default">
          <span className="font-semibold">Event Type:</span>{" "}
          <span>
            {booking.eventType.title} ({bookingEventTypeSlug})
          </span>
        </span>
        <span className="text-default">
          <span className="font-semibold">Organizer:</span> <span>{booking.user?.email || "Unknown"}</span>
        </span>
        <span className="text-default">
          <span className="font-semibold">Attendees:</span>{" "}
          <span>{booking.attendees.map((attendee) => attendee.email).join(", ")}</span>
        </span>
      </div>
    </div>
  );
};

const RerouteDialogContentAndFooter = ({
  isOpenDialog,
  setIsOpenDialog,
  routedFromRoutingFormReponseId,
  booking,
}: Pick<
  RerouteDialogProps,
  "isOpenDialog" | "setIsOpenDialog" | "routedFromRoutingFormReponseId" | "booking"
>) => {
  const { t } = useLocale();
  const router = useRouter();

  const { data: responseWithForm, isPending: isRoutingFormLoading } =
    trpc.viewer.appRoutingForms.getResponseWithFormFields.useQuery({
      formResponseId: routedFromRoutingFormReponseId,
    });
  const [_response, setResponse] = useState<FormResponse>({});
  const response = _response || responseWithForm?.response;

  const form = responseWithForm?.form;
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [chosenRoute, setChosenRoute] = useState<LocalRoute | null>(null);
  const [reroutingState, setReroutingState] = useState<ReroutingState | null>(null);
  const bookingEventType = booking.eventType;
  const bookingEventTypeSlug = bookingEventType.team
    ? `team/${bookingEventType.team.slug}/${bookingEventType.slug}`
    : `${bookingEventType.users[0].username}/${bookingEventType.slug}`;

  // Computed state for eventTypeSlugToRedirect
  const eventTypeSlugToRedirect =
    chosenRoute?.action.type === "eventTypeRedirectUrl" ? chosenRoute.action.value : null;

  const [teamMembersMatchingAttributeLogic, setTeamMembersMatchingAttributeLogic] = useState<
    | {
        id: number;
        name: string | null;
        email: string;
      }[]
    | null
  >([]);

  const findTeamMembersMatchingAttributeLogicMutation =
    trpc.viewer.appRoutingForms.findTeamMembersMatchingAttributeLogic.useMutation({
      onSuccess(data) {
        setTeamMembersMatchingAttributeLogic(data);
      },
    });

  const createBookingMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: (booking) => {
      const { paymentUid } = booking;
      if (paymentUid) {
        throw new Error("Payment is not supported yet");
      }

      showToast("Re-routed booker successfully", "success");
      // FIXME: DO we need to send other params as well?
      router.push(`/booking/${booking.uid}?cal.reRouting=true`);
    },
    onError: (err, _, ctx) => {
      showToast(
        "Failed to book the same timeslot with new team members. You could reschedule with different timeslot",
        "error"
      );
    },
  });

  if (!isOpenDialog && reroutingState?.reschedulerWindow) {
    reroutingState.reschedulerWindow.close();
    setReroutingState(null);
  }

  const messageListener = useCallback((event: MessageEvent) => {
    if (event.data.type === "CAL:rescheduleBookingSuccessfulV2") {
      const calEventData = event.data.data;
      setReroutingState((prev) => {
        if (!prev) return null;
        return { ...prev, newBooking: calEventData.uid };
      });
    }
  }, []);

  const beforeUnloadListener = useCallback(() => {
    reroutingState?.reschedulerWindow?.close();
    setReroutingState(null);
  }, [reroutingState?.reschedulerWindow]);

  useEffect(() => {
    window.addEventListener("message", messageListener);
    window.addEventListener("beforeunload", beforeUnloadListener);
    return () => {
      window.removeEventListener("message", messageListener);
      window.removeEventListener("beforeunload", beforeUnloadListener);
    };
  }, [messageListener, beforeUnloadListener]);

  const teamMemberIdsMatchingAttributeLogic =
    teamMembersMatchingAttributeLogic?.map((member) => member.id) || null;

  function handleRebookInNewTab() {
    if (!chosenRoute) {
      console.error("Chosen route must be there for rerouting");
      throw new Error("Something went wrong");
    }
    if (!form) {
      console.error("Form must be there for rerouting");
      throw new Error("Something went wrong");
    }

    rebookInNewTab({
      response,
      routedFromRoutingFormReponseId,
      form,
      teamMemberIdsMatchingAttributeLogic,
      chosenRoute,
      booking,
      setReroutingState,
      bookingEventTypeSlug,
    });
  }

  function rescheduleToSameTimeslotOfSameEvent() {
    if (!chosenRoute) {
      console.error("Chosen route must be there for rerouting");
      throw new Error("Something went wrong");
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
        return {
          bookingUid: booking.uid,
          seatReferenceUid: booking.seatReferenceUid,
        };
      }

      function getHashedLinkFields() {
        return {
          hasHashedBookingLink: booking.hashedLink ? true : false,
          hashedLink: booking.hashedLink,
        };
      }
    };

    const getFieldFromEventTypeThatRemainSame = () => {
      if (!bookingEventType.team) {
        throw new Error("Only team event can be re-routed");
      }

      if (!bookingEventType.team.slug) {
        throw new Error("Team slug must be there for rerouting");
      }

      return {
        user: bookingEventType.team.slug,
        eventTypeId: bookingEventType.id,
        eventTypeSlug: bookingEventType.slug,
      };
    };

    const getTimeslotFields = () => {
      return {
        // It is possible that EvenType changed its duration, so we would consider that as well.
        start: dayjs(booking.startTime).format(),
        end: dayjs(booking.startTime)
          // Defaults to the default event length in case no custom duration is set.
          .add(bookingEventType.length, "minute")
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
      return {
        // TODO: Need to get it from salesforce
        //teamMemberEmail: booker.email,
      };
    };

    // TODO: Long term, we should refactor handleNewBooking and use a different route specific for this purpose,
    createBookingMutation.mutate({
      isRerouting: true,
      rescheduleUid: booking.uid,
      reroutingFormResponses: response,
      ...getTimeslotFields(),
      ...getFieldsThatRemainSame(),
      ...getFieldFromEventTypeThatRemainSame(),
      ...getRoutingFormRelatedFields(),
      ...getSalesforceContactOwnerFields(),
    });
  }

  function verifyRoute() {
    if (!response) {
      setErrorMsg("You need to make some changes to the form first.");
      return;
    }

    if (!form) {
      console.error("Form must be there for rerouting");
      throw new Error("Something went wrong");
    }

    // Reset all states
    setReroutingState(null);
    setTeamMembersMatchingAttributeLogic(null);
    setErrorMsg("");

    const route = findMatchingRoute({
      form,
      response,
    });

    setChosenRoute(route || null);

    if (!route) return;

    findTeamMembersMatchingAttributeLogicMutation.mutate({
      formId: form.id,
      response,
      routeId: route.id,
    });
  }

  return (
    <div>
      {errorMsg && <div>{errorMsg}</div>}
      {form && response ? (
        <div>
          <FormInputFields response={response} form={form} setResponse={setResponse} />;
          <div className="flex flex-col gap-2">
            <CurrentRoutingStatus booking={booking} bookingEventTypeSlug={bookingEventTypeSlug} />
            {eventTypeSlugToRedirect && chosenRoute && (
              <NewRoutingManager
                chosenRoute={chosenRoute}
                eventTypeSlugToRedirect={eventTypeSlugToRedirect}
                bookingEventType={bookingEventType}
                isCreateBookingMutationPending={createBookingMutation.isPending}
                teamMembersMatchingAttributeLogic={{
                  isPending: findTeamMembersMatchingAttributeLogicMutation.isPending,
                  data: teamMembersMatchingAttributeLogic,
                }}
                reroutingState={reroutingState}
                rebookInNewTab={handleRebookInNewTab}
                rescheduleToSameTimeslotOfSameEvent={rescheduleToSameTimeslotOfSameEvent}
                setIsOpenDialog={setIsOpenDialog}
              />
            )}
          </div>
        </div>
      ) : isRoutingFormLoading ? (
        <div>Loading Routing Form...</div>
      ) : (
        <div>{t("something_went_wrong")}</div>
      )}
      <DialogFooter>
        <Button color="secondary" onClick={() => setIsOpenDialog(false)}>
          {t("cancel")}
        </Button>
        <Button onClick={verifyRoute}>{t("Verify new route")}</Button>
      </DialogFooter>
    </div>
  );
};

export const RerouteDialog = ({
  isOpenDialog,
  setIsOpenDialog,
  routedFromRoutingFormReponseId,
  booking,
}: RerouteDialogProps) => {
  const { t } = useLocale();
  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent enableOverflow preventCloseOnOutsideClick>
        <DialogHeader title={t("reroute_booking")} subtitle={t("reroute_booking_description")} />
        <RerouteDialogContentAndFooter
          isOpenDialog={isOpenDialog}
          setIsOpenDialog={setIsOpenDialog}
          routedFromRoutingFormReponseId={routedFromRoutingFormReponseId}
          booking={booking}
        />
      </DialogContent>
    </Dialog>
  );
};
