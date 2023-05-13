import { useState, useEffect } from "react";

import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { trpc } from "@calcom/trpc/react";
import { TextField, showToast } from "@calcom/ui";

import type { appDataSchema } from "../zod";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ eventType, app }) {
  const [getAppData, setAppData] = useAppContextWithSchema<typeof appDataSchema>();
  const awsAccessKeyId = getAppData("awsAccessKeyId");
  const awsSecretAccessId = getAppData("awsSecretAccessId");
  const s3Region = getAppData("s3Region");
  const s3Bucket = getAppData("s3Bucket");

  const [enabled, setEnabled] = useState(getAppData("enabled"));
  const utils = trpc.useContext();
  const { t } = useLocale();

  const updateMutation = trpc.viewer.eventTypes.update.useMutation({
    onSuccess: async () => {
      await utils.viewer.eventTypes.get.invalidate({ id: eventType.id });
      showToast(
        t("event_type_updated_successfully", {
          eventTypeTitle: eventType.title,
        }),
        "success"
      );
    },
    onSettled: async () => {
      await utils.viewer.eventTypes.get.invalidate({ id: eventType.id });
    },
    onError: (err) => {
      let message = "";
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }

      if (err.data?.code === "UNAUTHORIZED") {
        message = `${err.data.code}: You are not able to update this event`;
      }

      if (err.data?.code === "PARSE_ERROR" || err.data?.code === "BAD_REQUEST") {
        message = `${err.data.code}: ${err.message}`;
      }

      if (message) {
        showToast(message, "error");
      } else {
        showToast(err.message, "error");
      }
    },
  });

  // if enabled is true, then create a booking question
  // if enabled is false, then delete the booking question
  useEffect(() => {
    if (enabled) {
      // check if there is already a booking question with the type "fileUpload"
      const existingBookingField = eventType.bookingFields.find((field) => field.type === "fileUpload");
      if (existingBookingField) return;

      // create booking question
      const newBookingField = {
        editable: "user",
        label: "Upload file",
        name: "fileUpload",
        placeholder: "Upload file",
        required: false,
        sources: [
          {
            fieldRequired: false,
            id: "user",
            label: "User",
            type: "user",
          },
        ],
        type: "fileUpload",
      };
      // todo: add it to eventType.bookingFields array and save it through the mutation
      const newBookingFields = [...eventType.bookingFields, newBookingField];
      updateMutation.mutate({ bookingFields: newBookingFields, id: eventType.id });
    } else {
      // delete all booking questions with the type "fileUpload"
      const newBookingFields = eventType.bookingFields.filter((field) => field.type !== "fileUpload");
      if (newBookingFields.length !== eventType.bookingFields.length) {
        updateMutation.mutate({ bookingFields: newBookingFields, id: eventType.id });
      }
    }
  }, [enabled]);

  return (
    <AppCard
      setAppData={setAppData}
      app={app}
      switchOnClick={(e) => {
        if (!e) {
          setEnabled(false);
        } else {
          setEnabled(true);
        }
      }}
      switchChecked={enabled}>
      <TextField
        name="AWS Access Key ID"
        value={awsAccessKeyId}
        onChange={(e) => setAppData("awsAccessKeyId", e.target.value)}
      />
      <TextField
        name="AWS Secret Access ID"
        value={awsSecretAccessId}
        onChange={(e) => setAppData("awsSecretAccessId", e.target.value)}
      />
      <TextField name="S3 Region" value={s3Region} onChange={(e) => setAppData("s3Region", e.target.value)} />
      <TextField name="S3 Bucket" value={s3Bucket} onChange={(e) => setAppData("s3Bucket", e.target.value)} />
    </AppCard>
  );
};

export default EventTypeAppCard;
