import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Toaster } from "sonner";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { Form } from "@calcom/ui/components/form";
import { TextField } from "@calcom/ui/components/form";

export default function ProtonCalendarSetup() {
  const { t } = useLocale();
  const router = useRouter();
  const form = useForm({
    defaultValues: {
      url: "http://127.0.0.1:1083",
      username: "",
      password: "",
    },
  });

  const [errorMessage, setErrorMessage] = useState("");

  return (
    <div className="bg-emphasis flex h-screen">
      <div className="bg-default m-auto rounded p-5 md:w-[560px] md:p-10">
        <div className="flex flex-col stack-y-5 md:flex-row md:space-x-5 md:stack-y-0">
          <div>
            {/* eslint-disable @next/next/no-img-element */}
            <img
              src="/api/app-store/protoncalendar/icon.svg"
              alt={t("proton_calendar")}
              className="h-12 w-12 max-w-2xl"
            />
          </div>
          <div className="flex w-10/12 flex-col">
            <h1 className="text-default">{t("connect_proton_calendar")}</h1>
            <div className="mt-1 text-sm">
              {t("credentials_stored_encrypted")} {t("proton_calendar_requires")}{" "}
              <a
                className="underline"
                href="https://proton.me/mail/bridge"
                target="_blank"
                rel="noreferrer">
                Proton Bridge
              </a>{" "}
              {t("proton_bridge_caldav_instructions")}
            </div>
            <div className="my-2 mt-3">
              <Form
                form={form}
                handleSubmit={async (values) => {
                  setErrorMessage("");
                  try {
                    const res = await fetch("/api/integrations/protoncalendar/add", {
                      method: "POST",
                      body: JSON.stringify(values),
                      headers: {
                        "Content-Type": "application/json",
                      },
                    });
                    const json = await res.json().catch(() => null);
                    if (!res.ok) {
                      setErrorMessage(json?.message || t("something_went_wrong"));
                    } else if (json?.url) {
                      router.push(json.url);
                    } else {
                      setErrorMessage(t("something_went_wrong"));
                    }
                  } catch {
                    setErrorMessage(t("something_went_wrong"));
                  }
                }}>
                <fieldset className="stack-y-2" disabled={form.formState.isSubmitting}>
                  <TextField
                    required
                    type="text"
                    {...form.register("url")}
                    label={t("calendar_url")}
                    placeholder="http://127.0.0.1:1083"
                  />
                  <TextField
                    required
                    type="text"
                    {...form.register("username")}
                    label={t("email_address")}
                    placeholder="you@proton.me"
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

                {errorMessage && <Alert severity="error" title={errorMessage} className="my-4" />}
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
