import { PlusIcon } from "@heroicons/react/outline";
import { GetServerSidePropsContext } from "next";
import { useSession } from "next-auth/client";
import { useEffect, useState, useRef } from "react";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";
import { inferSSRProps } from "@lib/types/inferSSRProps";
import { Webhook } from "@lib/webhook";

import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTrigger } from "@components/Dialog";
import Loader from "@components/Loader";
import SettingsShell from "@components/SettingsShell";
import Shell from "@components/Shell";
import Button from "@components/ui/Button";
import Switch from "@components/ui/Switch";
import EditWebhook from "@components/webhook/EditWebhook";
import WebhookList from "@components/webhook/WebhookList";

export default function Embed(props: inferSSRProps<typeof getServerSideProps>) {
  const [, loading] = useSession();

  const [isLoading, setLoading] = useState(false);
  const [bookingCreated, setBookingCreated] = useState(true);
  const [bookingRescheduled, setBookingRescheduled] = useState(true);
  const [bookingCancelled, setBookingCancelled] = useState(true);
  const [editWebhookEnabled, setEditWebhookEnabled] = useState(false);
  const [webhooks, setWebhooks] = useState([]);
  const [webhookToEdit, setWebhookToEdit] = useState<Webhook | null>();
  const [webhookEventTrigger, setWebhookEventTriggers] = useState([
    "BOOKING_CREATED",
    "BOOKING_RESCHEDULED",
    "BOOKING_CANCELLED",
  ]);

  const subUrlRef = useRef<HTMLInputElement>() as React.MutableRefObject<HTMLInputElement>;

  useEffect(() => {
    const arr = [];
    bookingCreated && arr.push("BOOKING_CREATED");
    bookingRescheduled && arr.push("BOOKING_RESCHEDULED");
    bookingCancelled && arr.push("BOOKING_CANCELLED");
    setWebhookEventTriggers(arr);
  }, [bookingCreated, bookingRescheduled, bookingCancelled]);

  useEffect(() => {
    getWebhooks();
  }, []);

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

  const getWebhooks = () => {
    fetch("/api/webhook")
      .then(handleErrors)
      .then((data) => {
        setWebhooks(
          data.webhooks.map((webhook: Webhook) => {
            return {
              ...webhook,
              eventTriggers: webhook.eventTriggers.map((eventTrigger: string) => eventTrigger.toLowerCase()),
            };
          })
        );
        console.log(data.webhooks);
      })
      .catch(console.log);
    setLoading(false);
  };

  const createWebhook = () => {
    setLoading(true);
    fetch("/api/webhook", {
      method: "POST",
      body: JSON.stringify({
        subscriberUrl: subUrlRef.current.value,
        eventTriggers: webhookEventTrigger,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then(getWebhooks)
      .catch(console.log);
  };

  const editWebhook = (webhook: Webhook) => {
    setEditWebhookEnabled(true);
    setWebhookToEdit(webhook);
  };

  const onCloseEdit = () => {
    getWebhooks();
    setEditWebhookEnabled(false);
  };

  return (
    <Shell
      heading="Embed &amp; Webhooks"
      subtitle="Integrate with your website using our embed options, or get real-time booking information using custom webhooks.">
      <SettingsShell>
        {!editWebhookEnabled && (
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
            <div className="flex justify-between my-6">
              <div>
                <h2 className="text-lg font-medium leading-6 text-gray-900 font-cal">Webhooks</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Receive Cal meeting data at a specified URL, in real-time, when an event is scheduled or
                  cancelled.{" "}
                </p>
              </div>
              <div>
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
                        <legend className="block pt-4 mb-2 text-sm font-medium text-gray-700">
                          {" "}
                          Event Triggers{" "}
                        </legend>
                        <div className="p-2 border border-gray-300 rounded-sm">
                          <div className="flex pb-4">
                            <div className="w-10/12">
                              <h2 className="font-medium text-gray-800">Booking Created</h2>
                            </div>
                            <div className="flex items-center justify-center w-2/12 text-right">
                              <Switch
                                defaultChecked={true}
                                id="booking-created"
                                value={bookingCreated}
                                onCheckedChange={() => {
                                  setBookingCreated(!bookingCreated);
                                }}
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
                                id="booking-rescheduled"
                                value={bookingRescheduled}
                                onCheckedChange={() => {
                                  setBookingRescheduled(!bookingRescheduled);
                                }}
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
                                id="booking-cancelled"
                                value={bookingCancelled}
                                onCheckedChange={() => {
                                  setBookingCancelled(!bookingCancelled);
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="gap-2 mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <DialogClose asChild>
                          <Button
                            type="button"
                            loading={isLoading}
                            onClick={createWebhook}
                            color="primary"
                            className="ml-2">
                            Create Webhook
                          </Button>
                        </DialogClose>
                        <DialogClose asChild>
                          <Button color="secondary">Cancel</Button>
                        </DialogClose>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="divide-y divide-gray-200 lg:col-span-9">
              <div className="py-6 lg:pb-8">
                <div className="flex flex-col justify-between md:flex-row">
                  <div></div>
                </div>
                <div>
                  {!!webhooks.length && (
                    <WebhookList
                      webhooks={webhooks}
                      onChange={getWebhooks}
                      onEditWebhook={editWebhook}></WebhookList>
                  )}
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
        )}
        {!!editWebhookEnabled && <EditWebhook webhook={webhookToEdit} onCloseEdit={onCloseEdit} />}
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
