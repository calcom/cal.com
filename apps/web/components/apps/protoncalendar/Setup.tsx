import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Toaster } from "sonner";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { Form, TextField } from "@calcom/ui/components/form";
import { PlusIcon, TrashIcon } from "@coss/ui/icons";

export default function ProtonCalendarSetup() {
  const { t } = useLocale();
  const router = useRouter();
  const form = useForm({
    defaultValues: {},
  });

  const [urls, setUrls] = useState<string[]>([""]);
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
            <div className="mt-1 text-sm">{t("credentials_stored_encrypted")}</div>
            <div className="my-2 mt-3">
              <Form
                form={form}
                handleSubmit={async (_) => {
                  setErrorMessage("");

                  try {
                    const res = await fetch("/api/integrations/protoncalendar/add", {
                      method: "POST",
                      body: JSON.stringify({ urls }),
                      headers: {
                        "Content-Type": "application/json",
                      },
                    });
                    const json = await res.json().catch(() => ({}));

                    if (!res.ok) {
                      setErrorMessage(json?.message || t("something_went_wrong"));
                      return;
                    }

                    router.push(json.url);
                  } catch {
                    setErrorMessage(t("something_went_wrong"));
                  }
                }}>
                <fieldset className="stack-y-2" disabled={form.formState.isSubmitting}>
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
                        placeholder={t("proton_calendar_url_placeholder")}
                      />
                      {i !== 0 ? (
                        <button
                          type="button"
                          aria-label={t("remove")}
                          className="mb-2 h-min text-sm"
                          onClick={() => setUrls((urls) => urls.filter((_, ii) => i !== ii))}>
                          <TrashIcon size={16} />
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
                  {t("add")} <PlusIcon className="inline" size={16} />
                </button>

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
