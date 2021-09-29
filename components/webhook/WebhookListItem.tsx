import { TrashIcon, PencilAltIcon } from "@heroicons/react/outline";
import { EventType } from "@prisma/client";
import { useEffect, useRef, useState } from "react";

// import showToast from "@lib/notification";
import { Webhook } from "@lib/webhook";

import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTrigger } from "@components/Dialog";
import { Tooltip } from "@components/Tooltip";
import ConfirmationDialogContent from "@components/dialog/ConfirmationDialogContent";
import Button from "@components/ui/Button";
import Switch from "@components/ui/Switch";

export default function WebhookListItem(props: {
  onChange: () => void;
  key: number;
  webhook: Webhook;
  eventTypes: EventType[];
}) {
  const [bookingCreated, setBookingCreated] = useState(true);
  const [bookingRescheduled, setBookingRescheduled] = useState(true);
  const [bookingCancelled, setBookingCancelled] = useState(true);
  const [webhookEventTrigger, setWebhookEventTriggers] = useState([
    "BOOKING_CREATED",
    "BOOKING_RESCHEDULED",
    "BOOKING_CANCELLED",
  ]);
  const [webhookEventTypes, setWebhookEventTypes] = useState(props.eventTypes);
  const [selectedWebhookEventTypes, setSelectedWebhookEventTypes] = useState([]);
  const [webhookEnabled, setWebhookEnabled] = useState(true);
  const subUrlRef = useRef<HTMLInputElement>() as React.MutableRefObject<HTMLInputElement>;

  const handleErrors = async (resp: Response) => {
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.message);
    }
    return resp.json();
  };

  useEffect(() => {
    const arr = [];
    bookingCreated && arr.push("BOOKING_CREATED");
    bookingRescheduled && arr.push("BOOKING_RESCHEDULED");
    bookingCancelled && arr.push("BOOKING_CANCELLED");
    setWebhookEventTriggers(arr);
  }, [bookingCreated, bookingRescheduled, bookingCancelled, selectedWebhookEventTypes]);

  function eventTypeSelectionHandler(eventType) {
    return (selected) => {
      const i = webhookEventTypes.findIndex((c) => c.slug === eventType.slug);
      webhookEventTypes[i].selected = selected;
      if (selected) {
        if (!selectedWebhookEventTypes.includes(eventType.slug)) {
          setSelectedWebhookEventTypes([...selectedWebhookEventTypes, eventType.slug]);
        }
      } else {
        const index = selectedWebhookEventTypes.indexOf(eventType.slug);
        if (index > -1) {
          const arr = selectedWebhookEventTypes;
          arr.splice(index, 1);
          console.log(arr);
          setSelectedWebhookEventTypes(arr);
        }
      }
    };
  }

  const editWebhook = (webhookId: number) => {
    console.log(
      webhookId,
      subUrlRef.current.value,
      webhookEventTrigger,
      selectedWebhookEventTypes,
      webhookEnabled
    );
    // fetch("/api/webhooks/" + webhookId, {
    //   method: "PATCH",
    //   body: JSON.stringify({
    //     subscriberUrl: subUrlRef.current.value,
    //     eventTriggers: webhookEventTrigger,
    //     eventTypeId: selectedWebhookEventTypes,
    //     enabled: webhookEnabled,
    //   }),
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    // })
    //   .then(handleErrors)
    //   .then((data) => {
    //     console.log("Delete", data);
    //     props.onChange();
    //   });
  };

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
            <span className="self-center h-6 px-3 py-1 text-xs text-gray-700 capitalize rounded-md bg-gray-50">
              Disabled
            </span>
          )}
          {!!props.webhook.active && (
            <span className="self-center h-6 px-3 py-1 text-xs text-green-700 capitalize rounded-md bg-green-50">
              Enabled
            </span>
          )}

          <Dialog>
            <Tooltip content="Edit Webhook">
              <DialogTrigger asChild>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  color="minimal"
                  StartIcon={PencilAltIcon}
                  className="self-center w-full p-2 pr-0 ml-4 border border-transparent group text-neutral-400 hover:border-gray-200 hover:text-neutral-700"></Button>
              </DialogTrigger>
            </Tooltip>
            <DialogContent>
              <DialogHeader title="Edit Webhook" subtitle="Edit your webhook details" />
              <div className="my-4">
                <div className="mb-4">
                  <label htmlFor="subUrl" className="block text-sm font-medium text-gray-700">
                    Subscriber Url
                  </label>
                  <input
                    ref={subUrlRef}
                    type="text"
                    name="subUrl"
                    id="subUrl"
                    defaultValue={props.webhook.subscriberUrl || ""}
                    placeholder="https://example.com/sub"
                    required
                    className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-sm shadow-sm focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                  />
                  <legend className="block pt-4 mb-2 text-sm font-medium text-gray-700"> Event Types </legend>
                  <div className="p-2 border border-gray-300 rounded-sm">
                    <ul className="overflow-y-auto max-h-96">
                      {props.eventTypes.map((eventType) => (
                        <li key={eventType.slug} className="flex py-2">
                          <div className="w-10/12">
                            <h2 className="text-sm text-gray-800 align-middle">/{eventType.slug}</h2>
                          </div>
                          <div className="flex items-center justify-center w-2/12 text-right">
                            {!!props.webhook.webhookEvents
                              .map((event) => {
                                return event.slug;
                              })
                              .includes(eventType.slug) && (
                              <Switch
                                defaultChecked={true}
                                onCheckedChange={eventTypeSelectionHandler(eventType)}
                              />
                            )}
                            {!props.webhook.webhookEvents
                              .map((event) => {
                                return event.slug;
                              })
                              .includes(eventType.slug) && (
                              <Switch
                                defaultChecked={false}
                                onCheckedChange={eventTypeSelectionHandler(eventType)}
                              />
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <legend className="block pt-4 mb-2 text-sm font-medium text-gray-700">
                    {" "}
                    Event Triggers{" "}
                  </legend>
                  <div className="p-2 border border-gray-300 rounded-sm">
                    <div className="flex py-2">
                      <div className="w-10/12">
                        <h2 className="text-sm text-gray-800">Booking Created</h2>
                      </div>
                      <div className="flex items-center justify-center w-2/12 text-right">
                        {props.webhook.eventTriggers.includes("booking_created") && (
                          <Switch
                            defaultChecked={true}
                            id="booking-created"
                            value={bookingCreated}
                            onCheckedChange={() => {
                              setBookingCreated(!bookingCreated);
                            }}
                          />
                        )}
                        {!props.webhook.eventTriggers.includes("booking_created") && (
                          <Switch
                            defaultChecked={false}
                            id="booking-created"
                            value={bookingCreated}
                            onCheckedChange={() => {
                              setBookingCreated(!bookingCreated);
                            }}
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex py-1">
                      <div className="w-10/12">
                        <h2 className="text-sm text-gray-800">Booking Rescheduled</h2>
                      </div>
                      <div className="flex items-center justify-center w-2/12 text-right">
                        {props.webhook.eventTriggers.includes("booking_rescheduled") && (
                          <Switch
                            defaultChecked={true}
                            id="booking-rescheduled"
                            value={bookingRescheduled}
                            onCheckedChange={() => {
                              setBookingRescheduled(!bookingRescheduled);
                            }}
                          />
                        )}
                        {!props.webhook.eventTriggers.includes("booking_rescheduled") && (
                          <Switch
                            defaultChecked={false}
                            id="booking-rescheduled"
                            value={bookingRescheduled}
                            onCheckedChange={() => {
                              setBookingRescheduled(!bookingRescheduled);
                            }}
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex py-2">
                      <div className="w-10/12">
                        <h2 className="text-sm text-gray-800">Booking Cancelled</h2>
                      </div>
                      <div className="flex items-center justify-center w-2/12 text-right">
                        {props.webhook.eventTriggers.includes("booking_cancelled") && (
                          <Switch
                            defaultChecked={true}
                            id="booking-cancelled"
                            value={bookingCancelled}
                            onCheckedChange={() => {
                              setBookingCancelled(!bookingCancelled);
                            }}
                          />
                        )}
                        {!props.webhook.eventTriggers.includes("booking_cancelled") && (
                          <Switch
                            defaultChecked={false}
                            id="booking-cancelled"
                            value={bookingCancelled}
                            onCheckedChange={() => {
                              setBookingCancelled(!bookingCancelled);
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  <legend className="block pt-4 mb-2 text-sm font-medium text-gray-700">
                    {" "}
                    Webhook Status{" "}
                  </legend>
                  <div className="p-2 border border-gray-300 rounded-sm">
                    <div className="flex">
                      <div className="w-10/12">
                        <h2 className="text-sm text-gray-800">Webhook Enabled</h2>
                      </div>
                      <div className="flex items-center justify-center w-2/12 text-right">
                        <Switch
                          defaultChecked={true}
                          id="webhook-enabled"
                          value={webhookEnabled}
                          onCheckedChange={() => {
                            setWebhookEnabled(!webhookEnabled);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="gap-2 mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <DialogClose asChild>
                    <Button
                      onClick={() => {
                        console.log("Save");
                        editWebhook(props.webhook.id);
                      }}
                      type="button"
                      color="primary"
                      className="ml-2">
                      Save
                    </Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button color="secondary">Cancel</Button>
                  </DialogClose>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
