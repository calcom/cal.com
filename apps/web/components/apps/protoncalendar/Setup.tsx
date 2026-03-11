import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Toaster } from "sonner";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { Form, TextField } from "@calcom/ui/components/form";

export default function ProtonCalendarSetup() {
  const { t } = useLocale();
  const router = useRouter();
  const form = useForm({ defaultValues: {} });
  const [url, setUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  return (
    <div className="bg-emphasis flex h-screen">
      <div className="bg-default m-auto rounded p-5 md:w-[560px] md:p-10">
        <div className="flex flex-col space-y-5 md:flex-row md:space-x-5 md:space-y-0">
          <div>
            {/* eslint-disable @next/next/no-img-element */}
            <img
              src="/api/app-store/protoncalendar/icon.svg"
              alt="Proton Calendar"
              className="h-12 w-12 max-w-2xl"
            />
          </div>
          <div className="flex w-10/12 flex-col">
            <h1 className="text-default text-xl font-semibold">Connect Proton Calendar</h1>
            <p className="mt-1 text-sm text-gray-500">{t("credentials_stored_encrypted")}</p>

            <details className="mt-3 text-sm text-gray-500">
              <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                How to get your ICS feed URL
              </summary>
              <ol className="mt-2 ml-4 list-decimal space-y-1">
                <li>
                  Open{" "}
                  <a
                    href="https://calendar.proton.me"
                    className="text-primary underline"
                    target="_blank"
                    rel="noopener noreferrer">
                    Proton Calendar
                  </a>
                </li>
                <li>
                  Click the <strong>⋮</strong> menu next to the calendar you want to connect
                </li>
                <li>
                  Select <strong>Share → Share with link</strong>
                </li>
                <li>Copy the generated ICS URL and paste it below</li>
              </ol>
            </details>

            <div className="my-2 mt-4">
              <Form
                form={form}
                handleSubmit={async () => {
                  setErrorMessage("");
                  const res = await fetch("/api/integrations/protoncalendar/add", {
                    method: "POST",
                    body: JSON.stringify({ url }),
                    headers: { "Content-Type": "application/json" },
                  });
                  const json = await res.json();
                  if (!res.ok) {
                    setErrorMessage(json?.message ?? t("something_went_wrong"));
                  } else {
                    router.push(json.url);
                  }
                }}>
                <fieldset disabled={form.formState.isSubmitting}>
                  <TextField
                    required
                    type="url"
                    label="Proton Calendar ICS feed URL"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://calendar.proton.me/api/calendar/v1/..."
                    containerClassName="w-full"
                  />
                </fieldset>

                {errorMessage && (
                  <Alert severity="error" title={errorMessage} className="my-4" />
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
