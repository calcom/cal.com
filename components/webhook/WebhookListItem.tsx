import { TrashIcon, PencilAltIcon } from "@heroicons/react/outline";
import { EventType } from "@prisma/client";

// import { useEffect, useRef, useState } from "react";
// import showToast from "@lib/notification";
import { Webhook } from "@lib/webhook";

import { Dialog, DialogTrigger } from "@components/Dialog";
import { Tooltip } from "@components/Tooltip";
import ConfirmationDialogContent from "@components/dialog/ConfirmationDialogContent";
import Button from "@components/ui/Button";

// import Switch from "@components/ui/Switch";

export default function WebhookListItem(props: {
  onChange: () => void;
  key: number;
  webhook: Webhook;
  eventTypes: EventType[];
  onEditWebhook: () => void;
}) {
  // const [bookingCreated, setBookingCreated] = useState(true);
  // const [bookingRescheduled, setBookingRescheduled] = useState(true);
  // const [bookingCancelled, setBookingCancelled] = useState(true);
  // const [webhookEventTrigger, setWebhookEventTriggers] = useState([
  //   "BOOKING_CREATED",
  //   "BOOKING_RESCHEDULED",
  //   "BOOKING_CANCELLED",
  // ]);
  // const [webhookEventTypes, setWebhookEventTypes] = useState(props.eventTypes);
  // const [selectedWebhookEventTypes, setSelectedWebhookEventTypes] = useState([]);
  // const [webhookEnabled, setWebhookEnabled] = useState(true);
  // const subUrlRef = useRef<HTMLInputElement>() as React.MutableRefObject<HTMLInputElement>;

  const handleErrors = async (resp: Response) => {
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.message);
    }
    return resp.json();
  };

  // useEffect(() => {
  //   const arr = [];
  //   bookingCreated && arr.push("BOOKING_CREATED");
  //   bookingRescheduled && arr.push("BOOKING_RESCHEDULED");
  //   bookingCancelled && arr.push("BOOKING_CANCELLED");
  //   setWebhookEventTriggers(arr);
  // }, [bookingCreated, bookingRescheduled, bookingCancelled, selectedWebhookEventTypes]);

  const deleteWebhook = (webhookId: number) => {
    fetch("/api/webhooks/" + webhookId, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then(handleErrors)
      .then((data) => {
        console.log("Delete", data);
        props.onChange();
      });
  };

  return (
    <li className="divide-y">
      <div className="flex justify-between my-4">
        <div className="flex pr-2 border-r border-gray-100">
          <span className="flex flex-col space-y-2 text-xs">
            {props.webhook.eventTriggers.map((eventTrigger, ind) => (
              <span key={ind} className="px-1 text-xs text-blue-700 rounded-md w-max bg-blue-50">
                {eventTrigger}
              </span>
            ))}
          </span>
        </div>
        <div className="flex w-full">
          <div className="self-center inline-block ml-3 space-y-1">
            <span className="flex text-sm text-neutral-700">{props.webhook.subscriberUrl}</span>

            <div className="inline-block space-x-1 space-y-1">
              {props.webhook.webhookEvents.map((webhookEvent, ind: number) => (
                <span key={ind} className="px-2 py-1 text-xs text-gray-700 rounded-md w-max bg-gray-50">
                  {"/"}
                  {webhookEvent.slug}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex">
          {!props.webhook.active && (
            <span className="self-center h-6 px-3 py-1 text-xs text-red-700 capitalize rounded-md bg-red-50">
              Disabled
            </span>
          )}
          {!!props.webhook.active && (
            <span className="self-center h-6 px-3 py-1 text-xs text-green-700 capitalize rounded-md bg-green-50">
              Enabled
            </span>
          )}

          <Tooltip content="Edit Webhook">
            <Button
              onClick={() => props.onEditWebhook()}
              color="minimal"
              StartIcon={PencilAltIcon}
              className="self-center w-full p-2 pr-0 ml-4 border border-transparent group text-neutral-400 hover:border-gray-200 hover:text-neutral-700"></Button>
          </Tooltip>
          <Dialog>
            <Tooltip content="Delete Webhook">
              <DialogTrigger asChild>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  color="minimal"
                  StartIcon={TrashIcon}
                  className="self-center w-full p-2 pr-0 ml-2 border border-transparent group text-neutral-400 hover:border-gray-200 hover:text-neutral-700"></Button>
              </DialogTrigger>
            </Tooltip>
            <ConfirmationDialogContent
              variety="danger"
              title="Delete Webhook"
              confirmBtnText="Yes, delete webhook"
              cancelBtnText="Cancel"
              onConfirm={() => {
                console.log("confirm");
                //delete webhook
                deleteWebhook(props.webhook.id);
              }}>
              Are you sure you want to delete this webhook? You will no longer receive Cal.com meeting data at
              a specified URL, in real-time, when an event is scheduled or canceled .
            </ConfirmationDialogContent>
          </Dialog>
        </div>
      </div>
    </li>
  );
}
