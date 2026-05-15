import { isProtonCalendarUrl } from "@calcom/app-store/protoncalendar/lib/isProtonCalendarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { Form, TextField } from "@calcom/ui/components/form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Toaster } from "sonner";

type ProtonCalendarSetupFormValues = {
  url: string;
};

export default function ProtonCalendarSetup(): JSX.Element {
  const { t } = useLocale();
  const router = useRouter();
  const form = useForm<ProtonCalendarSetupFormValues>({
    defaultValues: {
      url: "",
    },
  });

  const [errorMessage, setErrorMessage] = useState("");

  return (
    <div className="flex h-screen bg-emphasis">
      <div className="m-auto rounded bg-default p-5 md:w-[560px] md:p-10">
        <div className="stack-y-5 md:stack-y-0 flex flex-col md:flex-row md:space-x-5">
          <div>
            {/* eslint-disable @next/next/no-img-element */}
            {/* biome-ignore lint/performance/noImgElement: App setup pages serve app icons through /api/app-store. */}
            <img
              src="/api/app-store/protoncalendar/icon.svg"
              alt="Proton Calendar"
              className="h-12 w-12 max-w-2xl"
            />
          </div>
          <div className="flex w-10/12 flex-col">
            <h1 className="text-default">{t("connect_proton_calendar")}</h1>
            <div className="mt-1 text-sm">{t("credentials_stored_encrypted")}</div>
            <div className="mt-3 text-sm text-subtle">{t("proton_calendar_paste_share_link")}</div>
            <div className="mt-3 text-sm text-subtle">{t("proton_calendar_setup_instructions")}</div>
            <div className="my-2 mt-3">
              <Form
                form={form}
                handleSubmit={async (values: ProtonCalendarSetupFormValues): Promise<void> => {
                  setErrorMessage("");
                  const rawUrl = values.url.trim();

                  if (!isProtonCalendarUrl(rawUrl)) {
                    setErrorMessage(t("invalid_proton_calendar_url"));
                    return;
                  }

                  const res = await fetch("/api/integrations/protoncalendar/add", {
                    method: "POST",
                    body: JSON.stringify({ url: rawUrl }),
                    headers: {
                      "Content-Type": "application/json",
                    },
                  });
                  const json = await res.json();
                  if (!res.ok) {
                    setErrorMessage(json?.message || t("something_went_wrong"));
                  } else {
                    router.push(json.url);
                  }
                }}>
                <fieldset className="stack-y-2" disabled={form.formState.isSubmitting}>
                  <TextField
                    required
                    type="url"
                    label={t("calendar_url")}
                    containerClassName="w-full"
                    {...form.register("url", {
                      required: true,
                    })}
                    placeholder="https://calendar.proton.me/..."
                  />
                </fieldset>

                {errorMessage && <Alert severity="error" title={errorMessage} className="my-4" />}
                <div className="mt-5 justify-end space-x-2 sm:mt-4 sm:flex rtl:space-x-reverse">
                  <Button type="button" color="secondary" onClick={(): void => router.back()}>
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
