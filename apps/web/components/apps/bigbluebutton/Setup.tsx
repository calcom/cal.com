import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Toaster } from "sonner";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { Form } from "@calcom/ui/components/form";
import { TextField } from "@calcom/ui/components/form";
import { PasswordField } from "@calcom/ui/components/form";

export default function BigBlueButtonSetup() {
  const { t } = useLocale();
  const router = useRouter();
  const form = useForm({
    defaultValues: {
      serverUrl: "",
      sharedSecret: "",
    },
  });

  const [errorMessage, setErrorMessage] = useState("");

  return (
    <div className="bg-emphasis flex h-screen">
      <div className="bg-default m-auto rounded p-5 md:w-[560px] md:p-10">
        <div className="flex flex-col space-y-5 md:flex-row md:space-x-5 md:space-y-0">
          <div>
            {/* eslint-disable @next/next/no-img-element */}
            <img
              src="/api/app-store/bigbluebutton/icon.svg"
              alt="BigBlueButton"
              className="h-12 w-12 max-w-2xl"
            />
          </div>
          <div className="flex w-10/12 flex-col">
            <h1 className="text-default">Connect BigBlueButton</h1>
            <div className="mt-1 text-sm">
              Enter your BigBlueButton server URL and shared secret to enable video conferencing.
            </div>
            <div className="my-2 mt-3">
              <Form
                form={form}
                handleSubmit={async (values) => {
                  setErrorMessage("");
                  const res = await fetch("/api/integrations/bigbluebutton/add", {
                    method: "POST",
                    body: JSON.stringify(values),
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
                <fieldset className="space-y-2" disabled={form.formState.isSubmitting}>
                  <TextField
                    required
                    type="url"
                    {...form.register("serverUrl")}
                    label="Server URL"
                    placeholder="https://your-bbb-server.com/bigbluebutton/"
                  />
                  <PasswordField
                    required
                    {...form.register("sharedSecret")}
                    label="Shared Secret"
                    placeholder="Your BBB shared secret"
                    autoComplete="password"
                  />
                </fieldset>

                {errorMessage && <Alert className="mt-4" severity="error" title={errorMessage} />}
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
        <Toaster />
      </div>
    </div>
  );
}
