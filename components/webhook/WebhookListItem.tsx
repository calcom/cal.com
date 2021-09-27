import { TrashIcon, PencilAltIcon } from "@heroicons/react/outline";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTrigger } from "@components/Dialog";
import ConfirmationDialogContent from "@components/dialog/ConfirmationDialogContent";
import Button from "@components/ui/Button";
// import showToast from "@lib/notification";
import { Webhook } from "@lib/webhook";
import Switch from "@components/ui/Switch";
import { useRef, useState } from "react";

export default function WebhookListItem(props: { onChange: () => void; key: number; webhook: Webhook }) {
  const [bookingCreated, setBookingCreated] = useState(true);
  const [bookingRescheduled, setBookingRescheduled] = useState(true);
  const [bookingCancelled, setBookingCancelled] = useState(true);
  const [webhooks, setWebhooks] = useState([]);
  const [webhookEventTrigger, setWebhookEventTriggers] = useState([
    "BOOKING_CREATED",
    "BOOKING_RESCHEDULED",
    "BOOKING_CANCELLED",
  ]);
  const [webhookEventTypes, setWebhookEventTypes] = useState([]);
  const [webhookEnabled, setWebhookEnabled] = useState(true);
  const subUrlRef = useRef<HTMLInputElement>() as React.MutableRefObject<HTMLInputElement>;

  const handleErrors = async (resp: Response) => {
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.message);
    }
    return resp.json();
  };
  const onCheckedChange = (val: boolean | string, ref: string) => {
    switch (ref) {
      case "booking-created":
        setBookingCreated(!bookingCreated);
        break;
      case "booking-rescheduled":
        setBookingRescheduled(!bookingRescheduled);
        break;
      case "booking-cancelled":
        setBookingCancelled(!bookingCancelled);
        break;
      case "webhook-enabled":
        setWebhookEnabled(!webhookEnabled);
        break;
    }
    const arr = [];
    bookingCreated && arr.push("BOOKING_CREATED");
    bookingRescheduled && arr.push("BOOKING_RESCHEDULED");
    bookingCancelled && arr.push("BOOKING_CANCELLED");
    setWebhookEventTriggers(arr);
  };

  return (
    <li className="divide-y">
      <div className="flex justify-between my-4">
        <div className="flex pr-2 border-r border-gray-100">
          <span className="flex flex-col space-y-2 text-xs">
            {props.webhook.eventTriggers.map((webhookEventTrigger, ind) => (
              <span key={ind} className="px-1 text-xs text-blue-700 rounded-md w-max bg-blue-50">
                {webhookEventTrigger}
              </span>
            ))}
          </span>
        </div>
        <div className="flex w-full">
          <div className="self-center inline-block ml-3 space-y-1">
            <span className="flex text-sm text-neutral-700">{props.webhook.subscriberUrl}</span>

            <div className="inline-block space-y-1">
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
            <DialogTrigger asChild>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                }}
                color="minimal"
                StartIcon={PencilAltIcon}
                className="self-center w-full py-2 pr-0 ml-2"></Button>
            </DialogTrigger>
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
                    value={props.webhook.subscriberUrl || ""}
                    placeholder="https://example.com/sub"
                    required
                    className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-sm shadow-sm focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                  />
                  <legend className="block pt-4 mb-2 text-sm font-medium text-gray-700">
                    {" "}
                    Select Event Triggers{" "}
                  </legend>
                  <div className="p-2 border border-gray-300 rounded-sm">
                    <div className="flex pb-4">
                      <div className="w-10/12">
                        <h2 className="font-medium text-gray-800">Booking Created</h2>
                      </div>
                      <div className="flex items-center justify-center w-2/12 text-right">
                        <Switch
                          defaultChecked={true}
                          cid="booking-created"
                          value={bookingCreated}
                          onCheckedChange={onCheckedChange}
                        />
                      </div>
                    </div>
                    <div className="flex py-1">
                      <div className="w-10/12">
                        <h2 className="font-medium text-gray-800">Booking Rescheduled</h2>
                      </div>
                      <div className="flex items-center justify-center w-2/12 text-right">
                        <Switch
                          defaultChecked={true}
                          cid="booking-rescheduled"
                          value={bookingRescheduled}
                          onCheckedChange={onCheckedChange}
                        />
                      </div>
                    </div>
                    <div className="flex pt-4">
                      <div className="w-10/12">
                        <h2 className="font-medium text-gray-800">Booking Cancelled</h2>
                      </div>
                      <div className="flex items-center justify-center w-2/12 text-right">
                        <Switch
                          defaultChecked={true}
                          cid="booking-cancelled"
                          value={bookingCancelled}
                          onCheckedChange={onCheckedChange}
                        />
                      </div>
                    </div>
                  </div>
                  {/* <legend className="block pt-4 mb-2 text-sm font-medium text-gray-700"> Event Types </legend>
                  <div className="p-2 border border-gray-300 rounded-sm">
                    {props.webhook.webhookEvents.map((webhookEvent, ind: number) => (
                      <div key={webhookEvent.slug} className="flex">
                        <div className="w-10/12">
                          <h2 className="font-medium text-gray-800">
                            {"/"}
                            {webhookEvent.slug}
                          </h2>
                        </div>
                        <div className="flex items-center justify-center w-2/12 text-right">
                          <Switch
                            defaultChecked={true}
                            cid={webhookEvent.slug}
                            value={webhookEvent.slug}
                            onCheckedChange={onCheckedChange}
                          />
                        </div>
                      </div>
                    ))}
                  </div> */}
                  <legend className="block pt-4 mb-2 text-sm font-medium text-gray-700">
                    {" "}
                    Webhook Status{" "}
                  </legend>
                  <div className="p-2 border border-gray-300 rounded-sm">
                    <div className="flex">
                      <div className="w-10/12">
                        <h2 className="font-medium text-gray-800">Webhook Enabled</h2>
                      </div>
                      <div className="flex items-center justify-center w-2/12 text-right">
                        <Switch
                          defaultChecked={true}
                          cid="webhook-enabled"
                          value={webhookEnabled}
                          onCheckedChange={onCheckedChange}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="gap-2 mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <Button type="button" color="primary" className="ml-2">
                    Save
                  </Button>
                  <DialogClose asChild>
                    <Button color="secondary">Cancel</Button>
                  </DialogClose>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                }}
                color="warn"
                StartIcon={TrashIcon}
                className="self-center w-full py-2 pr-0 ml-2"></Button>
            </DialogTrigger>
            <ConfirmationDialogContent
              variety="danger"
              title="Delete Webhook"
              confirmBtnText="Yes, delete webhook"
              cancelBtnText="Cancel"
              onConfirm={() => {
                console.log("confirm");
                //delete webhook
                deleteWebhook();
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
