import { ArrowLeftIcon } from "@heroicons/react/solid";
import { useEffect, useRef, useState } from "react";

import { useLocale } from "@lib/hooks/useLocale";
import showToast from "@lib/notification";
import { Webhook } from "@lib/webhook";

import Button from "@components/ui/Button";
import Switch from "@components/ui/Switch";

export default function EditTeam(props: { webhook: Webhook; onCloseEdit: () => void }) {
  const { t } = useLocale();
  const [bookingCreated, setBookingCreated] = useState(
    props.webhook.eventTriggers.includes("booking_created")
  );
  const [bookingRescheduled, setBookingRescheduled] = useState(
    props.webhook.eventTriggers.includes("booking_rescheduled")
  );
  const [bookingCancelled, setBookingCancelled] = useState(
    props.webhook.eventTriggers.includes("booking_cancelled")
  );
  const [webhookEnabled, setWebhookEnabled] = useState(props.webhook.active);
  const [webhookEventTrigger, setWebhookEventTriggers] = useState([
    "BOOKING_CREATED",
    "BOOKING_RESCHEDULED",
    "BOOKING_CANCELLED",
  ]);
  const [btnLoading, setBtnLoading] = useState(false);
  const subUrlRef = useRef<HTMLInputElement>() as React.MutableRefObject<HTMLInputElement>;

  useEffect(() => {
    const arr = [];
    bookingCreated && arr.push("BOOKING_CREATED");
    bookingRescheduled && arr.push("BOOKING_RESCHEDULED");
    bookingCancelled && arr.push("BOOKING_CANCELLED");
    setWebhookEventTriggers(arr);
  }, [bookingCreated, bookingRescheduled, bookingCancelled, webhookEnabled]);

  const handleErrors = async (resp: Response) => {
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.message);
    }
    return resp.json();
  };

  const updateWebhookHandler = (event) => {
    event.preventDefault();
    setBtnLoading(true);
    return fetch("/api/webhooks/" + props.webhook.id, {
      method: "PATCH",
      body: JSON.stringify({
        subscriberUrl: subUrlRef.current.value,
        eventTriggers: webhookEventTrigger,
        enabled: webhookEnabled,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then(handleErrors)
      .then(() => {
        showToast(t("webhook_updated_successfully"), "success");
        setBtnLoading(false);
      });
  };

  return (
    <div className="divide-y divide-gray-200 lg:col-span-9">
      <div className="py-6 lg:pb-8">
        <div className="mb-4">
          <Button
            type="button"
            color="secondary"
            size="sm"
            loading={btnLoading}
            StartIcon={ArrowLeftIcon}
            onClick={() => props.onCloseEdit()}>
            {t("back")}
          </Button>
        </div>
        <div>
          <div className="pb-5 pr-4 sm:pb-6">
            <h3 className="text-lg font-bold leading-6 text-gray-900">{t("manage_your_webhook")}</h3>
          </div>
        </div>
        <hr className="mt-2" />
        <form className="divide-y divide-gray-200 lg:col-span-9" onSubmit={updateWebhookHandler}>
          <div className="my-4">
            <div className="mb-4">
              <label htmlFor="subUrl" className="block text-sm font-medium text-gray-700">
                {t("subscriber_url")}
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
              <legend className="block pt-4 mb-2 text-sm font-medium text-gray-700">
                {" "}
                {t("event_triggers")}{" "}
              </legend>
              <div className="p-2 bg-white border border-gray-300 rounded-sm">
                <div className="flex p-2">
                  <div className="w-10/12">
                    <h2 className="text-sm text-gray-800">{t("booking_created")}</h2>
                  </div>
                  <div className="flex items-center justify-end w-2/12 text-right">
                    <Switch
                      defaultChecked={bookingCreated}
                      onCheckedChange={() => {
                        setBookingCreated(!bookingCreated);
                      }}
                    />
                  </div>
                </div>
                <div className="flex px-2 py-1">
                  <div className="w-10/12">
                    <h2 className="text-sm text-gray-800">{t("booking_rescheduled")}</h2>
                  </div>
                  <div className="flex items-center justify-end w-2/12 text-right">
                    <Switch
                      defaultChecked={bookingRescheduled}
                      onCheckedChange={() => {
                        setBookingRescheduled(!bookingRescheduled);
                      }}
                    />
                  </div>
                </div>
                <div className="flex p-2">
                  <div className="w-10/12">
                    <h2 className="text-sm text-gray-800">{t("booking_cancelled")}</h2>
                  </div>
                  <div className="flex items-center justify-end w-2/12 text-right">
                    <Switch
                      defaultChecked={bookingCancelled}
                      onCheckedChange={() => {
                        setBookingCancelled(!bookingCancelled);
                      }}
                    />
                  </div>
                </div>
              </div>
              <legend className="block pt-4 mb-2 text-sm font-medium text-gray-700">
                {" "}
                {t("webhook_status")}{" "}
              </legend>
              <div className="p-2 bg-white border border-gray-300 rounded-sm">
                <div className="flex p-2">
                  <div className="w-10/12">
                    <h2 className="text-sm text-gray-800">{t("webhook_enabled")}</h2>
                  </div>
                  <div className="flex items-center justify-end w-2/12 text-right">
                    <Switch
                      defaultChecked={webhookEnabled}
                      onCheckedChange={() => {
                        setWebhookEnabled(!webhookEnabled);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="gap-2 mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
              <Button type="submit" color="primary" className="ml-2" loading={btnLoading}>
                {t("save")}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
