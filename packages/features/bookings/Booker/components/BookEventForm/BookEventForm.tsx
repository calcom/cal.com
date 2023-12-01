import { zodResolver } from "@hookform/resolvers/zod";
import type { UseMutationResult } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import type { TFunction } from "next-i18next";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FieldError } from "react-hook-form";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { EventLocationType } from "@calcom/app-store/locations";
import { createPaymentLink } from "@calcom/app-store/stripepayment/lib/client";
import dayjs from "@calcom/dayjs";
import { VerifyCodeDialog } from "@calcom/features/bookings/components/VerifyCodeDialog";
import {
  createBooking,
  createRecurringBooking,
  mapBookingToMutationInput,
  mapRecurringBookingToMutationInput,
  useTimePreferences,
} from "@calcom/features/bookings/lib";
import getBookingResponsesSchema, {
  getBookingResponsesPartialSchema,
} from "@calcom/features/bookings/lib/getBookingResponsesSchema";
import { getFullName } from "@calcom/features/form-builder/utils";
import { useBookingSuccessRedirect } from "@calcom/lib/bookingSuccessRedirect";
import { MINUTES_TO_BOOK } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { trpc } from "@calcom/trpc";
import { Alert, Button, EmptyScreen, Form, showToast } from "@calcom/ui";
import { Calendar } from "@calcom/ui/components/icon";

import { useBookerStore } from "../../store";
import { useSlotReservationId } from "../../useSlotReservationId";
import { useEvent } from "../../utils/event";
import { BookingFields } from "./BookingFields";
import { FormSkeleton } from "./Skeleton";

type BookEventFormProps = {
  onCancel?: () => void;
  hashedLink?: string | null;
};

type DefaultValues = Record<string, unknown>;

export const BookEventForm = ({ onCancel, hashedLink }: BookEventFormProps) => {
  const [slotReservationId, setSlotReservationId] = useSlotReservationId();
  const reserveSlotMutation = trpc.viewer.public.slots.reserveSlot.useMutation({
    trpc: {
      context: {
        skipBatch: true,
      },
    },
    onSuccess: (data) => {
      setSlotReservationId(data.uid);
    },
  });
  const removeSelectedSlot = trpc.viewer.public.slots.removeSelectedSlotMark.useMutation({
    trpc: { context: { skipBatch: true } },
  });

  const rescheduleUid = useBookerStore((state) => state.rescheduleUid);
  const bookingData = useBookerStore((state) => state.bookingData);
  const duration = useBookerStore((state) => state.selectedDuration);
  const timeslot = useBookerStore((state) => state.selectedTimeslot);
  const isRescheduling = !!rescheduleUid && !!bookingData;
  const eventQuery = useEvent();
  const eventType = eventQuery.data;

  const reserveSlot = () => {
    if (eventType?.id && timeslot && (duration || eventType?.length)) {
      reserveSlotMutation.mutate({
        slotUtcStartDate: dayjs(timeslot).utc().format(),
        eventTypeId: eventType?.id,
        slotUtcEndDate: dayjs(timeslot)
          .utc()
          .add(duration || eventType?.length, "minutes")
          .format(),
      });
    }
  };

  useEffect(() => {
    reserveSlot();

    const interval = setInterval(() => {
      reserveSlot();
    }, parseInt(MINUTES_TO_BOOK) * 60 * 1000 - 2000);

    return () => {
      if (eventType) {
        removeSelectedSlot.mutate({ uid: slotReservationId });
      }
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType?.id, timeslot]);

  const { initialValues, key } = useInitialFormValues({
    eventType,
    rescheduleUid,
    isRescheduling,
  });

  return (
    <BookEventFormChild
      // initialValues would be null initially as the async schema parsing is happening. Let's show the form in first render without any prefill values
      // But ensure that when initialValues is available, the form is reset and rerendered with the prefill values
      key={key}
      onCancel={onCancel}
      initialValues={initialValues}
      isRescheduling={isRescheduling}
      eventQuery={eventQuery}
      rescheduleUid={rescheduleUid}
      hashedLink={hashedLink}
    />
  );
};

export const BookEventFormChild = ({
  onCancel,
  initialValues,
  isRescheduling,
  eventQuery,
  rescheduleUid,
  hashedLink,
}: BookEventFormProps & {
  initialValues: DefaultValues;
  isRescheduling: boolean;
  eventQuery: ReturnType<typeof useEvent>;
  rescheduleUid: string | null;
  hashedLink?: string | null;
}) => {
  const eventType = eventQuery.data;
  const bookingFormSchema = z
    .object({
      responses: eventQuery?.data
        ? getBookingResponsesSchema({
            eventType: eventQuery?.data,
            view: rescheduleUid ? "reschedule" : "booking",
          })
        : // Fallback until event is loaded.
          z.object({}),
    })
    .passthrough();
  const searchParams = useSearchParams();
  const routerQuery = useRouterQuery();
  const setFormValues = useBookerStore((state) => state.setFormValues);
  const seatedEventData = useBookerStore((state) => state.seatedEventData);
  const verifiedEmail = useBookerStore((state) => state.verifiedEmail);
  const setVerifiedEmail = useBookerStore((state) => state.setVerifiedEmail);
  const bookingSuccessRedirect = useBookingSuccessRedirect();
  const [responseVercelIdHeader, setResponseVercelIdHeader] = useState<string | null>(null);

  const router = useRouter();
  const { t, i18n } = useLocale();
  const { timezone } = useTimePreferences();
  const errorRef = useRef<HTMLDivElement>(null);
  const bookingData = useBookerStore((state) => state.bookingData);
  const eventSlug = useBookerStore((state) => state.eventSlug);
  const duration = useBookerStore((state) => state.selectedDuration);
  const timeslot = useBookerStore((state) => state.selectedTimeslot);
  const recurringEventCount = useBookerStore((state) => state.recurringEventCount);
  const username = useBookerStore((state) => state.username);
  type BookingFormValues = {
    locationType?: EventLocationType["type"];
    responses: z.infer<typeof bookingFormSchema>["responses"] | null;
    // Key is not really part of form values, but only used to have a key
    // to set generic error messages on. Needed until RHF has implemented root error keys.
    globalError: undefined;
  };

  const bookingForm = useForm<BookingFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(
      // Since this isn't set to strict we only validate the fields in the schema
      bookingFormSchema,
      {},
      {
        // bookingFormSchema is an async schema, so inform RHF to do async validation.
        mode: "async",
      }
    ),
  });
  const createBookingMutation = useMutation(createBooking, {
    onSuccess: (responseData) => {
      const { uid, paymentUid } = responseData;
      const fullName = getFullName(bookingForm.getValues("responses.name"));
      if (paymentUid) {
        return router.push(
          createPaymentLink({
            paymentUid,
            date: timeslot,
            name: fullName,
            email: bookingForm.getValues("responses.email"),
            absolute: false,
          })
        );
      }

      if (!uid) {
        console.error("No uid returned from createBookingMutation");
        return;
      }

      const query = {
        isSuccessBookingPage: true,
        email: bookingForm.getValues("responses.email"),
        eventTypeSlug: eventSlug,
        seatReferenceUid: "seatReferenceUid" in responseData ? responseData.seatReferenceUid : null,
        formerTime:
          isRescheduling && bookingData?.startTime ? dayjs(bookingData.startTime).toString() : undefined,
      };

      return bookingSuccessRedirect({
        successRedirectUrl: eventType?.successRedirectUrl || "",
        query,
        booking: responseData,
      });
    },
    onError: (err, _, ctx) => {
      // TODO:
      // const vercelId = ctx?.meta?.headers?.get("x-vercel-id");
      // if (vercelId) {
      //   setResponseVercelIdHeader(vercelId);
      // }
      errorRef && errorRef.current?.scrollIntoView({ behavior: "smooth" });
    },
  });

  const createRecurringBookingMutation = useMutation(createRecurringBooking, {
    onSuccess: async (responseData) => {
      const booking = responseData[0] || {};
      const { uid } = booking;

      if (!uid) {
        console.error("No uid returned from createRecurringBookingMutation");
        return;
      }

      const query = {
        isSuccessBookingPage: true,
        allRemainingBookings: true,
        email: bookingForm.getValues("responses.email"),
        eventTypeSlug: eventSlug,
        formerTime:
          isRescheduling && bookingData?.startTime ? dayjs(bookingData.startTime).toString() : undefined,
      };

      return bookingSuccessRedirect({
        successRedirectUrl: eventType?.successRedirectUrl || "",
        query,
        booking,
      });
    },
  });

  const [isEmailVerificationModalVisible, setEmailVerificationModalVisible] = useState(false);
  const email = bookingForm.watch("responses.email");

  const sendEmailVerificationByCodeMutation = trpc.viewer.auth.sendVerifyEmailCode.useMutation({
    onSuccess() {
      showToast(t("email_sent"), "success");
    },
    onError() {
      showToast(t("email_not_sent"), "error");
    },
  });

  const verifyEmail = () => {
    bookingForm.clearErrors();

    // It shouldn't be possible that this method is fired without having event data,
    // but since in theory (looking at the types) it is possible, we still handle that case.
    if (!eventQuery?.data) {
      bookingForm.setError("globalError", { message: t("error_booking_event") });
      return;
    }

    const name = bookingForm.getValues("responses.name");

    sendEmailVerificationByCodeMutation.mutate({
      email,
      username: typeof name === "string" ? name : name.firstName,
    });
    setEmailVerificationModalVisible(true);
  };

  if (eventQuery.isError) return <Alert severity="warning" message={t("error_booking_event")} />;
  if (eventQuery.isLoading || !eventQuery.data) return <FormSkeleton />;
  if (!timeslot)
    return (
      <EmptyScreen
        headline={t("timeslot_missing_title")}
        description={t("timeslot_missing_description")}
        Icon={Calendar}
        buttonText={t("timeslot_missing_cta")}
        buttonOnClick={onCancel}
      />
    );

  const bookEvent = (values: BookingFormValues) => {
    // Clears form values stored in store, so old values won't stick around.
    setFormValues({});
    bookingForm.clearErrors();

    // It shouldn't be possible that this method is fired without having eventQuery data,
    // but since in theory (looking at the types) it is possible, we still handle that case.
    if (!eventQuery?.data) {
      bookingForm.setError("globalError", { message: t("error_booking_event") });
      return;
    }

    // Ensures that duration is an allowed value, if not it defaults to the
    // default eventQuery duration.
    const validDuration =
      duration &&
      eventQuery.data.metadata?.multipleDuration &&
      eventQuery.data.metadata?.multipleDuration.includes(duration)
        ? duration
        : eventQuery.data.length;

    const bookingInput = {
      values,
      duration: validDuration,
      event: eventQuery.data,
      date: timeslot,
      timeZone: timezone,
      language: i18n.language,
      rescheduleUid: rescheduleUid || undefined,
      bookingUid: (bookingData && bookingData.uid) || seatedEventData?.bookingUid || undefined,
      username: username || "",
      metadata: Object.keys(routerQuery)
        .filter((key) => key.startsWith("metadata"))
        .reduce(
          (metadata, key) => ({
            ...metadata,
            [key.substring("metadata[".length, key.length - 1)]: searchParams?.get(key),
          }),
          {}
        ),
      hashedLink,
    };

    if (eventQuery.data?.recurringEvent?.freq && recurringEventCount && !rescheduleUid) {
      createRecurringBookingMutation.mutate(
        mapRecurringBookingToMutationInput(bookingInput, recurringEventCount)
      );
    } else {
      createBookingMutation.mutate(mapBookingToMutationInput(bookingInput));
    }
  };

  if (!eventType) {
    console.warn("No event type found for event", routerQuery);
    return <Alert severity="warning" message={t("error_booking_event")} />;
  }

  const renderConfirmNotVerifyEmailButtonCond =
    !eventType?.requiresBookerEmailVerification || (email && verifiedEmail && verifiedEmail === email);

  return (
    <div className="flex h-full flex-col">
      <Form
        className="flex h-full flex-col"
        onChange={() => {
          // Form data is saved in store. This way when user navigates back to
          // still change the timeslot, and comes back to the form, all their values
          // still exist. This gets cleared when the form is submitted.
          const values = bookingForm.getValues();
          setFormValues(values);
        }}
        form={bookingForm}
        handleSubmit={renderConfirmNotVerifyEmailButtonCond ? bookEvent : verifyEmail}
        noValidate>
        <BookingFields
          isDynamicGroupBooking={!!(username && username.indexOf("+") > -1)}
          fields={eventType.bookingFields}
          locations={eventType.locations}
          rescheduleUid={rescheduleUid || undefined}
          bookingData={bookingData}
        />
        {(createBookingMutation.isError ||
          createRecurringBookingMutation.isError ||
          bookingForm.formState.errors["globalError"]) && (
          <div data-testid="booking-fail">
            <Alert
              ref={errorRef}
              className="my-2"
              severity="info"
              title={rescheduleUid ? t("reschedule_fail") : t("booking_fail")}
              message={getError(
                bookingForm.formState.errors["globalError"],
                createBookingMutation,
                createRecurringBookingMutation,
                t,
                responseVercelIdHeader
              )}
            />
          </div>
        )}
        <div className="modalsticky mt-auto flex justify-end space-x-2 rtl:space-x-reverse">
          {!!onCancel && (
            <Button color="minimal" type="button" onClick={onCancel} data-testid="back">
              {t("back")}
            </Button>
          )}
          <Button
            type="submit"
            color="primary"
            loading={createBookingMutation.isLoading || createRecurringBookingMutation.isLoading}
            data-testid={rescheduleUid && bookingData ? "confirm-reschedule-button" : "confirm-book-button"}>
            {rescheduleUid && bookingData
              ? t("reschedule")
              : renderConfirmNotVerifyEmailButtonCond
              ? t("confirm")
              : t("verify_email_email_button")}
          </Button>
        </div>
      </Form>
      <VerifyCodeDialog
        isOpenDialog={isEmailVerificationModalVisible}
        setIsOpenDialog={setEmailVerificationModalVisible}
        email={email}
        onSuccess={() => {
          setVerifiedEmail(email);
          setEmailVerificationModalVisible(false);
          bookEvent(bookingForm.getValues());
        }}
        isUserSessionRequiredToVerify={false}
      />
    </div>
  );
};

const getError = (
  globalError: FieldError | undefined,
  // It feels like an implementation detail to reimplement the types of useMutation here.
  // Since they don't matter for this function, I'd rather disable them then giving you
  // the cognitive overload of thinking to update them here when anything changes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bookingMutation: UseMutationResult<any, any, any, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recurringBookingMutation: UseMutationResult<any, any, any, any>,
  t: TFunction,
  responseVercelIdHeader: string | null
) => {
  if (globalError) return globalError.message;

  const error = bookingMutation.error || recurringBookingMutation.error;

  return error.message ? (
    <>
      {responseVercelIdHeader ?? ""} {t(error.message)}
    </>
  ) : (
    <>{t("can_you_try_again")}</>
  );
};

function useInitialFormValues({
  eventType,
  rescheduleUid,
  isRescheduling,
}: {
  eventType: ReturnType<typeof useEvent>["data"];
  rescheduleUid: string | null;
  isRescheduling: boolean;
}) {
  const [initialValues, setDefaultValues] = useState<DefaultValues>({});
  const bookingData = useBookerStore((state) => state.bookingData);
  const formValues = useBookerStore((state) => state.formValues);
  const searchParams = useSearchParams();
  const routerQuery = useRouterQuery();
  const session = useSession();
  useEffect(() => {
    (async function () {
      if (Object.keys(formValues).length) {
        setDefaultValues(formValues);
        return;
      }

      if (!eventType?.bookingFields) {
        return {};
      }
      const querySchema = getBookingResponsesPartialSchema({
        eventType: {
          bookingFields: eventType.bookingFields,
        },
        view: rescheduleUid ? "reschedule" : "booking",
      });

      // Routing Forms don't support Split full name(because no Form Builder in there), so user needs to create two fields in there themselves. If they name these fields, `firstName` and `lastName`, we can prefill the Booking Form with them
      // Once we support formBuilder in Routing Forms, we should be able to forward JSON form of name field value to Booking Form and prefill it there without having these two query params separately.
      const firstNameQueryParam = searchParams?.get("firstName");
      const lastNameQueryParam = searchParams?.get("lastName");

      const parsedQuery = await querySchema.parseAsync({
        ...routerQuery,
        name:
          searchParams?.get("name") ||
          (firstNameQueryParam ? `${firstNameQueryParam} ${lastNameQueryParam}` : null),
        // `guest` because we need to support legacy URL with `guest` query param support
        // `guests` because the `name` of the corresponding bookingField is `guests`
        guests: searchParams?.getAll("guests") || searchParams?.getAll("guest"),
      });

      const defaultUserValues = {
        email:
          rescheduleUid && bookingData && bookingData.attendees.length > 0
            ? bookingData?.attendees[0].email
            : !!parsedQuery["email"]
            ? parsedQuery["email"]
            : session.data?.user?.email ?? "",
        name:
          rescheduleUid && bookingData && bookingData.attendees.length > 0
            ? bookingData?.attendees[0].name
            : !!parsedQuery["name"]
            ? parsedQuery["name"]
            : session.data?.user?.name ?? session.data?.user?.username ?? "",
      };

      if (!isRescheduling) {
        const defaults = {
          responses: {} as Partial<z.infer<ReturnType<typeof getBookingResponsesSchema>>>,
        };

        const responses = eventType.bookingFields.reduce((responses, field) => {
          return {
            ...responses,
            [field.name]: parsedQuery[field.name] || undefined,
          };
        }, {});

        defaults.responses = {
          ...responses,
          name: defaultUserValues.name,
          email: defaultUserValues.email,
        };

        setDefaultValues(defaults);
      }

      if (!rescheduleUid && !bookingData) {
        return {};
      }

      // We should allow current session user as default values for booking form

      const defaults = {
        responses: {} as Partial<z.infer<ReturnType<typeof getBookingResponsesSchema>>>,
      };

      const responses = eventType.bookingFields.reduce((responses, field) => {
        return {
          ...responses,
          [field.name]: bookingData?.responses[field.name],
        };
      }, {});
      defaults.responses = {
        ...responses,
        name: defaultUserValues.name,
        email: defaultUserValues.email,
      };
      setDefaultValues(defaults);
    })();
  }, [eventType?.bookingFields, formValues, isRescheduling, bookingData, rescheduleUid]);

  // When initialValues is available(after doing async schema parsing) or session is available(so that we can prefill logged-in user email and name), we need to reset the form with the initialValues
  const key = `${Object.keys(initialValues).length}_${session ? 1 : 0}`;

  return { initialValues, key };
}
