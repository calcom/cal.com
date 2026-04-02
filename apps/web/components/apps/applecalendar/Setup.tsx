import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { Form, PasswordField, TextField } from "@calcom/ui/components/form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Toaster } from "sonner";

export default function AppleCalendarSetup() {
  const { t } = useLocale();
  const router = useRouter();
  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const [errorMessage, setErrorMessage] = useState("");

  return (
    <div className="bg-emphasis flex h-screen dark:bg-inherit">
      <div className="bg-default dark:bg-cal-muted border-subtle m-auto rounded p-5 dark:border md:w-[560px] md:p-10">
        <div className="flex flex-col stack-y-5 md:flex-row md:space-x-5 md:stack-y-0">
          <div>
            {/* eslint-disable @next/next/no-img-element */}
            <img
              src="/api/app-store/applecalendar/icon.svg"
              alt="Apple Calendar"
              className="h-12 w-12 max-w-2xl"
            />
          </div>
          <div>
            <h1 className="text-default dark:text-emphasis mb-3 font-semibold">
              {t("connect_apple_server")}
            </h1>

            <div className="mt-1 text-sm">
              {t("apple_server_generate_password", { appName: APP_NAME })}{" "}
              <a
                className="font-bold hover:underline"
                href="https://appleid.apple.com/account/manage"
                target="_blank"
                rel="noopener noreferrer">
                https://appleid.apple.com/account/manage
              </a>
              . {t("credentials_stored_encrypted")}
            </div>
            <div className="my-2 mt-4">
              <Form
                form={form}
                handleSubmit={async (values) => {
                  try {
                    setErrorMessage("");
                    const res = await fetch("/api/integrations/applecalendar/add", {
                      method: "POST",
                      body: JSON.stringify(values),
                      headers: {
                        "Content-Type": "application/json",
                      },
                    });
                    const json = await res.json();
                    if (!res.ok) {
                      setErrorMessage(t(json?.message) || t("something_went_wrong"));
                    } else {
                      router.push(json.url);
                    }
                  } catch (err) {
                    setErrorMessage(t("unable_to_add_apple_calendar"));
                  }
                }}>
                <fieldset
                  className="stack-y-4"
                  disabled={form.formState.isSubmitting}
                  data-testid="apple-calendar-form">
                  <TextField
                    required
                    type="text"
                    {...form.register("username")}
                    label="Apple ID"
                    placeholder="appleid@domain.com"
                    data-testid="apple-calendar-email"
                  />
                  <PasswordField
                    required
                    {...form.register("password")}
                    label={t("password")}
                    placeholder="•••••••••••••"
                    autoComplete="password"
                    data-testid="apple-calendar-password"
                  />
                </fieldset>

                {errorMessage && <Alert severity="error" title={errorMessage} className="my-4" />}
                <div className="mt-5 justify-end space-x-2 rtl:space-x-reverse sm:mt-4 sm:flex">
                  <Button type="button" color="secondary" onClick={() => router.back()}>
                    {t("cancel")}
                  </Button>
                  <Button
                    type="submit"
                    loading={form.formState.isSubmitting}
                    data-testid="apple-calendar-login-button">
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
