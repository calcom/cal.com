import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { z } from "zod";

import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import type { useEvent } from "@calcom/features/bookings/Booker/utils/event";
import type getBookingResponsesSchema from "@calcom/features/bookings/lib/getBookingResponsesSchema";
import { getBookingResponsesPartialSchema } from "@calcom/features/bookings/lib/getBookingResponsesSchema";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";

export type useInitialFormValuesReturnType = ReturnType<typeof useInitialFormValues>;

export function useInitialFormValues({
  eventType,
  rescheduleUid,
  isRescheduling,
}: {
  eventType: ReturnType<typeof useEvent>["data"];
  rescheduleUid: string | null;
  isRescheduling: boolean;
}) {
  const [initialValues, setDefaultValues] = useState<Record<string, unknown>>({});
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
        bookingFields: eventType.bookingFields,
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
    // do not add routerQuery as a dependency, it will cause infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    eventType?.bookingFields,
    formValues,
    isRescheduling,
    bookingData,
    rescheduleUid,
    searchParams,
    session.data?.user?.email,
    session.data?.user?.name,
    session.data?.user?.username,
  ]);

  // When initialValues is available(after doing async schema parsing) or session is available(so that we can prefill logged-in user email and name), we need to reset the form with the initialValues
  const key = `${Object.keys(initialValues).length}_${session ? 1 : 0}`;

  return { initialValues, key };
}
