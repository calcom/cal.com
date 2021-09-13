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
import Checkbox from "@components/ui/form/checkbox";
import WebhookList from "@components/webhook/WebhookList";

import { EventTypeCustomInputType } from ".prisma/client";

export default function Embed(props: inferSSRProps<typeof getServerSideProps>) {
  const [, loading] = useSession();
  const [showCreateWebhookModal, setShowCreateWebhookModal] = useState(false);
  const [bookingCreated, setBookingCreated] = useState(true);
  const [bookingRescheduled, setBookingRescheduled] = useState(true);
  const [bookingCanceled, setBookingCanceled] = useState(true);
  const [webhooks, setWebhooks] = useState([]);
  const [webhookEventTypes, setWebhookEventTypes] = useState([]);
  const [webhookEventTrigger, setWebhookEventTriggers] = useState([
    "BOOKING_CREATED",
    "BOOKING_RESCHEDULED",
    "BOOKING_CANCELED",
  ]);

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
      case "booking-canceled":
        setBookingCanceled(!bookingCanceled);
        break;
    }
    const arr = [];
    bookingCreated && arr.push("BOOKING_CREATED");
    bookingRescheduled && arr.push("BOOKING_RESCHEDULED");
    bookingCanceled && arr.push("BOOKING_CANCELED");
    setWebhookEventTriggers(arr);
  };

  const getWebhooks = () => {
    fetch("/api/webhook")
      .then(handleErrors)
      .then((data) => {
        setWebhooks(data.webhooks);
        setWebhookEventTypes(
          data.webhookEventTypes.map((eventType: { eventTypeId: number }) => eventType.eventTypeId)
        );
        console.log("success", data);
      })
      .catch(console.log);
  };

  useEffect(() => {
    getWebhooks();
  }, []);

  if (loading) {
    return <Loader />;
  }

  const createWebhook = () => {};

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
              Receive Calendso meeting data at a specified URL, in real-time, when an event is scheduled or
              canceled.{" "}
            </p>
          </div>
          <div className="divide-y divide-gray-200 lg:col-span-9">
            <div className="py-6 lg:pb-8">
              <div className="flex flex-col justify-between md:flex-row">
                <div>
                  {!webhooks.length && (
                    <div className="sm:rounded-sm">
                      <div className="pb-5 pr-4 sm:pb-6">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">
                          Create a webhook to get started
                        </h3>
                        <div className="max-w-xl mt-2 text-sm text-gray-500">
                          <p>
                            Create your first webhook and get real-time meeting data when an event is
                            scheduled or canceled.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-start mb-4">
                  <Button
                    type="button"
                    onClick={() => setShowCreateWebhookModal(true)}
                    color="secondary"
                    StartIcon={PlusIcon}>
                    New Webhook
                  </Button>
                </div>
              </div>
              <div>
                {!!webhooks.length && (
                  <WebhookList
                    webhooks={webhooks}
                    webhookEventTypes={webhookEventTypes}
                    onChange={getWebhooks}></WebhookList>
                )}
              </div>
            </div>
          </div>

          {showCreateWebhookModal && (
            <div
              className="fixed inset-0 z-50 overflow-y-auto"
              aria-labelledby="modal-title"
              role="dialog"
              aria-modal="true">
              <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div
                  className="fixed inset-0 z-0 transition-opacity bg-gray-500 bg-opacity-75"
                  aria-hidden="true"></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                  &#8203;
                </span>

                <div className="inline-block px-4 pt-5 pb-4 text-left align-bottom transition-all transform bg-white rounded-sm shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                  <div className="mb-4 sm:flex sm:items-start">
                    <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto rounded-full bg-neutral-100 sm:mx-0 sm:h-10 sm:w-10">
                      <ShareIcon className="w-6 h-6 text-neutral-900" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                        Create a new Webhook
                      </h3>
                      <div>
                        <p className="text-sm text-gray-400">
                          Create a new webhook to get real-time calendso meeting data
                        </p>
                      </div>
                    </div>
                  </div>
                  <form onSubmit={createWebhook}>
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
                      <Checkbox
                        defaultChecked={true}
                        cid="booking-created"
                        label="Booking Created"
                        value={bookingCreated}
                        onCheckedChange={onCheckedChange}
                      />
                      <Checkbox
                        defaultChecked={true}
                        cid="booking-rescheduled"
                        label="Booking Rescheduled"
                        value={bookingRescheduled}
                        onCheckedChange={onCheckedChange}
                      />
                      <Checkbox
                        defaultChecked={true}
                        cid="booking-canceled"
                        label="Booking Canceled"
                        value={bookingCanceled}
                        onCheckedChange={onCheckedChange}
                      />
                    </div>
                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                      <Button type="submit" color="primary" className="ml-2">
                        Create Webhook
                      </Button>
                      <Button
                        onClick={() => setShowCreateWebhookModal(false)}
                        type="button"
                        color="secondary">
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

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
