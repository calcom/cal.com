import { useState, useEffect } from "react";

import type { UseBookingFormReturnType } from "@calcom/features/bookings/Booker/components/hooks/useBookingForm";
import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import { getBookingResponsesSchemaWithOptionalChecks } from "@calcom/features/bookings/lib/getBookingResponsesSchema";

import type { BookerEvent } from "../../../types";
import type { BookerState } from "../../types";

const useSkipConfirmStep = (
  bookingForm: UseBookingFormReturnType["bookingForm"],
  bookerState: BookerState,
  isInstantMeeting: boolean,
  bookingFields?: BookerEvent["bookingFields"]
) => {
  const bookingFormValues = bookingForm.getValues();

  const [canSkip, setCanSkip] = useState(false);
  const rescheduleUid = useBookerStore((state) => state.rescheduleUid);

  useEffect(() => {
    const checkSkipStep = async () => {
      if (!bookingFields) {
        setCanSkip(false);
        return;
      }

      try {
        const responseSchema = getBookingResponsesSchemaWithOptionalChecks({
          bookingFields,
          view: rescheduleUid ? "reschedule" : "booking",
        });
        const responseSafeParse = await responseSchema.safeParseAsync(bookingFormValues.responses);

        setCanSkip(responseSafeParse.success);
      } catch (error) {
        setCanSkip(false);
      }
    };

    bookerState === "selecting_time" && !isInstantMeeting && checkSkipStep();
  }, [bookingFormValues, bookingFields, rescheduleUid, bookerState]);

  return canSkip;
};

export default useSkipConfirmStep;
