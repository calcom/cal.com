import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Toaster } from "react-hot-toast";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert, Button, Form, TextField, CheckboxField } from "@calcom/ui";
import { Icon } from "@calcom/ui";

export default function ICSFeedSetup() {
  const { t } = useLocale();
  const router = useRouter();
  const form = useForm({
    defaultValues: {},
  });

  const [urls, setUrls] = useState<string[]>([""]);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorActionUrl, setErrorActionUrl] = useState("");
  const [skipWriting, setSkipWriting] = useState(false); // track if user opts out of writing to any calendar

  return (
    <div className="bg-emphasis flex h-screen">
      <div className="bg-default m-auto rounded p-5 md:w-[560px] md:p-10">
        <div className="flex flex-col space-y-5 md:flex-row md:space-x-5 md:space-y-0">
          <div>
            {/* eslint-disable @next/next/no-img-element */}
            <img
              src="/api/app-store/ics-feedcalendar/icon.svg"
              alt="ICS Feed"
              className="h-12 w-12 max-w-2xl"
            />
          </div>
          <div className="flex w-10/12 flex-col">
            <h1 className="text-default">{t("connect_ics_feed")}</h1>
            <div className="mt-1 text-sm">{t("credentials_stored_encrypted")}</div>
            <div className="my-2 mt-3">
              <Form
                form={form}
                handleSubmit={async (_) => {
                  setErrorMessage("");
                  const res = await fetch("/api/integrations/ics-feedcalendar/add", {
                    method: "POST",
                    body: JSON.stringify({ urls, skipWriting }),
                    headers: {
                      "Content-Type": "application/json",
                    },
                  });
                  const json = await res.json();
                  if (!res.ok) {
                    setErrorMessage(json?.message || t("something_went_wrong"));
                    if (json.actionUrl) {
                      setErrorActionUrl(json.actionUrl);
                    }
                  } else {
                    router.push(json.url);
                  }
                }}>
                <fieldset className="space-y-2" disabled={form.formState.isSubmitting}>
                  {urls.map((url, i) => (
                    <div key={i} className="flex w-full items-center gap-2">
                      <TextField
                        required
                        type="text"
                        label={t("calendar_url")}
                        value={url}
                        containerClassName={`w-full ${i === 0 ? "mr-6" : ""}`}
                        onChange={(e) => {
                          const newVal = e.target.value as string;
                          setUrls((urls) => urls.map((x, ii) => (ii === i ? newVal : x)));
                        }}
                        placeholder="https://example.com/calendar.ics"
                      />
                      {i !== 0 ? (
                        <button
                          type="button"
                          className="mb-2 h-min text-sm"
                          onClick={() => setUrls((urls) => urls.filter((_, ii) => i !== ii))}>
                          <Icon name="trash" size={16} />
                        </button>
                      ) : null}
                    </div>
                  ))}
                </fieldset>

                <button
                  className="text-sm"
                  type="button"
                  onClick={() => {
                    setUrls((urls) => urls.concat(""));
                  }}>
                  {t("add")} <Icon className="inline" name="plus" size={16} />
                </button>

                <div className="mt-3 flex items-center">
                  <CheckboxField
                    id="skipWriting"
                    checked={skipWriting}
                    onChange={(e) => setSkipWriting(e.target.checked)}
                    className="mr-2"
                    description={t("skip_writing_to_calendar")}
                  />
                </div>

                <Alert
                  className="mt-3"
                  severity="info"
                  title={t("notes")}
                  message={t("skip_writing_to_calendar_note")}
                />

                {errorMessage && (
                  <Alert
                    severity="error"
                    title={errorMessage}
                    actions={
                      errorActionUrl !== "" ? (
                        <Button
                          href={errorActionUrl}
                          color="secondary"
                          target="_blank"
                          className="ml-5 w-32 !p-5">
                          Go to Admin
                        </Button>
                      ) : undefined
                    }
                    className="my-4"
                  />
                )}
                <div className="mt-5 justify-end space-x-2 rtl:space-x-reverse sm:mt-4 sm:flex">
                  <Button type="button" color="secondary" onClick={() => router.back()}>
                    {t("cancel")}
                  </Button>
                  <Button type="submit" loading={form.formState.isSubmitting}>
                    {t("save")}
                  </Button>
                </div>
              </Form>
            </div>
          </div>
        </div>
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
}
