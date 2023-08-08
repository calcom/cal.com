import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Toaster } from "react-hot-toast";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert, Button, Form, TextField } from "@calcom/ui";

export default function CalDavCalendarSetup() {
  const { t } = useLocale();
  const router = useRouter();
  const form = useForm({
    defaultValues: {
      url: "",
      username: "",
      password: "",
    },
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [errorActionUrl, setErrorActionUrl] = useState("");

  return (
    <div className="bg-emphasis flex h-screen">
      <div className="bg-default m-auto rounded p-5 md:w-[560px] md:p-10">
        <div className="flex flex-col space-y-5 md:flex-row md:space-x-5 md:space-y-0">
          <div>
            {/* eslint-disable @next/next/no-img-element */}
            <img
              src="/api/app-store/caldavcalendar/icon.svg"
              alt="CalDav Calendar"
              className="h-12 w-12 max-w-2xl"
            />
          </div>
          <div className="flex w-10/12 flex-col">
            <h1 className="text-default">{t("connect_caldav")}</h1>
            <div className="mt-1 text-sm">{t("credentials_stored_encrypted")}</div>
            <div className="my-2 mt-3">
              <Form
                form={form}
                handleSubmit={async (values) => {
                  setErrorMessage("");
                  const res = await fetch("/api/integrations/caldavcalendar/add", {
                    method: "POST",
                    body: JSON.stringify(values),
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
                  <TextField
                    required
                    type="text"
                    {...form.register("url")}
                    label={t("calendar_url")}
                    placeholder="https://example.com/calendar"
                  />
                  <TextField
                    required
                    type="text"
                    {...form.register("username")}
                    label={t("username")}
                    placeholder="rickroll"
                  />
                  <TextField
                    required
                    type="password"
                    {...form.register("password")}
                    label={t("password")}
                    placeholder="•••••••••••••"
                    autoComplete="password"
                  />
                </fieldset>

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
