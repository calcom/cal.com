import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";
import { FormBuilderField } from "@calcom/features/form-builder/FormBuilderField";
import { fieldTypesSchemaMap } from "@calcom/features/form-builder/schema";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { telemetryEventTypes, collectPageParameters, useTelemetry } from "@calcom/lib/telemetry";
import type { RecurringEvent } from "@calcom/types/Calendar";
import { Button, Form } from "@calcom/ui";
import { X } from "@calcom/ui/components/icon";

type BookingFields = ReturnType<typeof getBookingFieldsWithSystemFields>;
type Props = {
  booking: {
    title?: string;
    uid?: string;
    id?: number;
  };
  bookingFields: BookingFields;
  profile: {
    name: string | null;
    slug: string | null;
  };
  recurringEvent: RecurringEvent | null;
  team?: string | null;
  setIsCancellationMode: (value: boolean) => void;
  theme: string | null;
  allRemainingBookings: boolean;
  seatReferenceUid?: string;
};

const CancellationFields = ({ bookingFields }: { bookingFields: BookingFields }) => {
  return (
    <>
      {bookingFields
        .filter((field) => field.form === "cancellation")
        .map((f) => {
          return <FormBuilderField key={f.name} field={f} />;
        })}
    </>
  );
};

export default function CancelBooking(props: Props) {
  const { t } = useLocale();
  const router = useRouter();
  const { booking, allRemainingBookings, seatReferenceUid } = props;
  const [loading, setLoading] = useState(false);
  const telemetry = useTelemetry();
  const [error, setError] = useState<string | null>(booking ? null : t("booking_already_cancelled"));

  type CancellationFormValues = {
    responses: {
      cancellationReason: string;
    };
  };

  const cancellationField = props.bookingFields.find((field) => field.name === "cancellationReason");
  if (!cancellationField) throw new Error("Cancellation field not found");

  const cancellationForm = useForm<CancellationFormValues>({
    // defaultValues: defaultValues(),
    resolver: zodResolver(
      z.object({
        responses: z.preprocess(
          (responses) => {
            const parsedResponses = z.record(z.any()).nullable().parse(responses) || {};
            return {
              cancellationReason: fieldTypesSchemaMap["text"]!.preprocess({
                response: parsedResponses["cancellationReason"],
                isPartialSchema: false,
                field: cancellationField,
              }),
            };
          },
          z
            .object({
              cancellationReason: z.string().optional(),
            })
            .superRefine((responses, ctx) => {
              const m = (message: string) => `{${cancellationField.name}}${message}`;

              fieldTypesSchemaMap["text"]!.superRefine({
                response: responses["cancellationReason"],
                isPartialSchema: false,
                field: cancellationField,
                ctx,
                m,
              });
            })
        ),
      })
    ), // Since this isn't set to strict we only validate the fields in the schema
    // resolver: zodResolver(
    //   z.object({
    //     responses: z.string(),
    //   })
    // ),
  });

  console.log("cancellationForm.formState", cancellationForm.formState.errors);

  // const cancelBookingRef = useCallback((node: HTMLTextAreaElement) => {
  //   if (node !== null) {
  //     node.scrollIntoView({ behavior: "smooth" });
  //     node.focus();
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);
  return (
    <Form
      form={cancellationForm}
      noValidate
      handleSubmit={async (data) => {
        setLoading(true);

        telemetry.event(telemetryEventTypes.bookingCancelled, collectPageParameters());

        const res = await fetch("/api/cancel", {
          body: JSON.stringify({
            uid: booking?.uid,
            cancellationReason: data.responses.cancellationReason,
            allRemainingBookings,
            // @NOTE: very important this shouldn't cancel with number ID use uid instead
            seatReferenceUid,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "DELETE",
        });

        if (res.status >= 200 && res.status < 300) {
          await router.replace(router.asPath);
        } else {
          setLoading(false);
          setError(`${t("error_with_status_code_occured", { status: res.status })} ${t("please_try_again")}`);
        }
      }}>
      {error && (
        <div className="mt-8">
          <div className="bg-error mx-auto flex h-12 w-12 items-center justify-center rounded-full">
            <X className="h-6 w-6 text-red-600" />
          </div>
          <div className="mt-3 text-center sm:mt-5">
            <h3 className="text-emphasis text-lg font-medium leading-6" id="modal-title">
              {error}
            </h3>
          </div>
        </div>
      )}
      {!error && (
        <div className="mt-5 sm:mt-6">
          <CancellationFields bookingFields={props.bookingFields} />
          <div className="flex flex-col-reverse rtl:space-x-reverse ">
            <div className="ml-auto flex w-full space-x-4 ">
              <Button
                className="ml-auto"
                color="secondary"
                onClick={() => props.setIsCancellationMode(false)}>
                {t("nevermind")}
              </Button>
              <Button data-testid="cancel" loading={loading} type="submit">
                {props.allRemainingBookings ? t("cancel_all_remaining") : t("cancel_event")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Form>
  );
}
