import Loader from "@components/Loader";
import SettingsShell from "@components/SettingsShell";
import Shell from "@components/Shell";
import Button from "@components/ui/Button";
import WebhookList from "@components/webhook/WebhookList";
import { PlusIcon, ShareIcon } from "@heroicons/react/outline";
import { GetServerSidePropsContext } from "next";
import { useSession } from "next-auth/client";
import { useEffect, useState, useRef } from "react";

import { getSession } from "@lib/auth";
// import { Member } from "@lib/member";
import prisma from "@lib/prisma";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import Loader from "@components/Loader";
import SettingsShell from "@components/Settings";
import Shell from "@components/Shell";
import Button from "@components/ui/Button";
import Switch from "@components/ui/Switch";
// import Checkbox from "@components/ui/form/checkbox";
import WebhookList from "@components/webhook/WebhookList";

import { EventTypeCustomInputType } from ".prisma/client";

export default function Embed(props: inferSSRProps<typeof getServerSideProps>) {
  const [, loading] = useSession();
  const [showCreateWebhookModal, setShowCreateWebhookModal] = useState(false);
import { useEffect, useState, useRef } from "react";
import { PlusIcon } from "@heroicons/react/outline";
import WebhookList from "@components/webhook/WebhookList";
import Switch from "@components/ui/Switch";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTrigger } from "@components/Dialog";

export default function Embed(props: { err: string | undefined; BASE_URL: string; user: Member }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [session, loading] = useSession();
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

  const subUrlRef = useRef<HTMLInputElement>() as React.MutableRefObject<HTMLInputElement>;

  if (loading) {
    return <Loader />;
  }

  const iframeTemplate = `<iframe src="${process.env.NEXT_PUBLIC_APP_URL}/${props.user?.username}" frameborder="0" allowfullscreen></iframe>`;
  const htmlTemplate = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Schedule a meeting</title><style>body {margin: 0;}iframe {height: calc(100vh - 4px);width: calc(100vw - 4px);box-sizing: border-box;}</style></head><body>${iframeTemplate}</body></html>`;
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
    }
    const arr = [];
    bookingCreated && arr.push("BOOKING_CREATED");
    bookingRescheduled && arr.push("BOOKING_RESCHEDULED");
    bookingCancelled && arr.push("BOOKING_CANCELLED");
    setWebhookEventTriggers(arr);
  };

  const getWebhooks = () => {
    fetch("/api/webhook")
      .then(handleErrors)
      .then((data) => {
        setWebhooks(
          data.webhooks.map((webhook) => {
            return {
              ...webhook,
              eventTriggers: webhook.eventTriggers.map((eventTrigger: string) => eventTrigger.toLowerCase()),
            };
          })
        );
      })
      .catch(console.log);
  };

  const getEventTypes = () => {
    fetch("/api/eventType")
      .then(handleErrors)
      .then((data) => {
        setWebhookEventTypes(data.eventTypes);
      });
  };

  useEffect(() => {
    getWebhooks();
    getEventTypes();
  }, []);

  if (loading) {
    return <Loader />;
  }

  const createWebhook = () => {
    fetch("/api/webhook", {
      method: "POST",
      body: JSON.stringify({
        subscriberUrl: subUrlRef.current.value,
        eventTriggers: webhookEventTrigger,
        eventTypeId: webhookEventTypes.map((webhookEventType) => webhookEventType.id),
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then(getWebhooks)
      .catch(console.log);
  };

  return (
    <Shell
      heading="Embed &amp; Webhooks"
      subtitle="Integrate with your website using our embed options, or get real-time booking information using custom webhooks.">
      <SettingsShell>
        <div className="py-6 lg:pb-8 lg:col-span-9">
          <div className="mb-6">
            <h2 className="text-lg font-medium leading-6 text-gray-900 font-cal">iframe Embed</h2>
            <p className="mt-1 text-sm text-gray-500">The easiest way to embed Cal.com on your website.</p>
          </div>
          <div className="grid grid-cols-2 space-x-4">
            <div>
              <label htmlFor="iframe" className="block text-sm font-medium text-gray-700">
                Standard iframe
              </label>
              <div className="mt-1">
                <textarea
                  id="iframe"
                  className="block w-full h-32 border-gray-300 rounded-sm shadow-sm focus:ring-black focus:border-black sm:text-sm"
                  placeholder="Loading..."
                  defaultValue={iframeTemplate}
                  readOnly
                />
              </div>
            </div>
            <div>
              <label htmlFor="fullscreen" className="block text-sm font-medium text-gray-700">
                Responsive full screen iframe
              </label>
              <div className="mt-1">
                <textarea
                  id="fullscreen"
                  className="block w-full h-32 border-gray-300 rounded-sm shadow-sm focus:ring-black focus:border-black sm:text-sm"
                  placeholder="Loading..."
                  defaultValue={htmlTemplate}
                  readOnly
                />
              </div>
            </div>
          </div>
          <hr className="mt-8" />
          <div className="my-6">
            <h2 className="text-lg font-medium leading-6 text-gray-900">Webhooks</h2>
            <p className="mt-1 text-sm text-gray-500">
              Receive Cal.com meeting data at a specified URL, in real-time, when an event is scheduled or
              cancelled.{" "}
            </p>
          </div>
          <div className="divide-y divide-gray-200 lg:col-span-9">
            <div className="py-6 lg:pb-8">
              <div className="flex flex-col justify-between md:flex-row">
                <div>
                  {/* {!webhooks.length && (
                    <div className="sm:rounded-sm">
                      <div className="pb-5 pr-4 sm:pb-6">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">
                          Create a webhook to get started
                        </h3>
                        <div className="max-w-xl mt-2 text-sm text-gray-500">
                          <p>
                            Create your first webhook and get real-time meeting data when an event is
                            scheduled or cancelled.
                          </p>
                        </div>
                      </div>
                    </div>
                  )} */}
                </div>

                <Dialog>
                  <DialogTrigger className="px-4 py-2 my-6 text-sm font-medium text-white border border-transparent rounded-sm shadow-sm bg-neutral-900 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900">
                    <PlusIcon className="inline w-5 h-5 mr-1" />
                    New Webhook
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader
                      title="Create a new webhook"
                      subtitle="Create a new webhook to your account"
                    />
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
                          placeholder="https://example.com/sub"
                          required
                          className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-sm shadow-sm focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                        />
                        <legend className="block mt-4 mb-2 text-sm font-medium text-gray-700">
                          {" "}
                          Select Event Triggers{" "}
                        </legend>
                        <div className="flex py-4">
                          <div className="w-10/12">
                            <h2 className="font-medium text-gray-800">Booking Created</h2>
                          </div>
                          <div className="w-2/12 text-right">
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
                          <div className="w-2/12 text-right">
                            <Switch
                              defaultChecked={true}
                              cid="booking-rescheduled"
                              value={bookingRescheduled}
                              onCheckedChange={onCheckedChange}
                            />
                          </div>
                        </div>
                        <div className="flex py-4">
                          <div className="w-10/12">
                            <h2 className="font-medium text-gray-800">Booking Cancelled</h2>
                          </div>
                          <div className="w-2/12 text-right">
                            <Switch
                              defaultChecked={true}
                              cid="booking-cancelled"
                              value={bookingCancelled}
                              onCheckedChange={onCheckedChange}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="gap-2 mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <Button type="button" onClick={createWebhook} color="primary" className="ml-2">
                          Create Webhook
                        </Button>
                        <DialogClose asChild>
                          <Button color="secondary">Cancel</Button>
                        </DialogClose>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div>
                {!!webhooks.length && <WebhookList webhooks={webhooks} onChange={getWebhooks}></WebhookList>}
              </div>
            </div>
          </div>

          <hr className="mt-8" />
          <div className="my-6">
            <h2 className="text-lg font-medium leading-6 text-gray-900 font-cal">Cal.com API</h2>
            <p className="mt-1 text-sm text-gray-500">
              Leverage our API for full control and customizability.
            </p>
          </div>
          <a href="https://developer.cal.com/api" className="btn btn-primary">
            Browse our API documentation
          </a>
        </div>
      </SettingsShell>
    </Shell>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getSession(context);
  if (!session?.user?.email) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  const user = await prisma.user.findFirst({
    where: {
      email: session?.user?.email,
    },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      bio: true,
      avatar: true,
      timeZone: true,
      weekStart: true,
    },
  });

  return {
    props: { session, user },
  };
}
