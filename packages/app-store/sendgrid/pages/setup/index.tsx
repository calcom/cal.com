import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Toaster } from "react-hot-toast";
import z from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Form, showToast, TextField } from "@calcom/ui";

const formSchema = z.object({
  api_key: z.string(),
});

export default function SendgridSetup() {
  const { t } = useLocale();
  const router = useRouter();
  const [testPassed, setTestPassed] = useState<boolean | undefined>(undefined);
  const [testLoading, setTestLoading] = useState<boolean>(false);

  const form = useForm<{
    api_key: string;
  }>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (testPassed === false) {
        setTestPassed(undefined);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [testPassed]);

  return (
    <div className="bg-emphasis flex h-screen">
      <div className="bg-default m-auto rounded p-5 md:w-[520px] md:p-10">
        <div className="flex flex-col space-y-5 md:flex-row md:space-x-5 md:space-y-0">
          <div>
            <img src="/api/app-store/sendgrid/logo.png" alt="Sendgrid" className="h-12 w-12 max-w-2xl" />
          </div>
          <div>
            <h1 className="text-default">{t("provide_api_key")}</h1>

            <div className="mt-1 text-sm">
              {t("generate_api_key_description", { appName: "Sendgrid" })}{" "}
              <a
                className="text-indigo-400"
                href="https://app.sendgrid.com/settings/api_keys"
                target="_blank"
                rel="noopener noreferrer">
                Sendgrid
              </a>
              . {t("it_stored_encrypted")}
            </div>
            <div className="my-2 mt-3">
              <Form
                form={form}
                handleSubmit={async (values) => {
                  const res = await fetch("/api/integrations/sendgrid/add", {
                    method: "POST",
                    body: JSON.stringify(values),
                    headers: {
                      "Content-Type": "application/json",
                    },
                  });
                  const json = await res.json();

                  if (res.ok) {
                    router.push(json.url);
                  } else {
                    showToast(json.message, "error");
                  }
                }}>
                <fieldset className="space-y-2" disabled={form.formState.isSubmitting}>
                  <Controller
                    name="api_key"
                    control={form.control}
                    render={({ field: { onBlur, onChange } }) => (
                      <TextField
                        className="my-0"
                        onBlur={onBlur}
                        disabled={testPassed === true}
                        name="api_key"
                        placeholder="SG.xxxxxx..."
                        onChange={async (e) => {
                          onChange(e.target.value);
                          form.setValue("api_key", e.target.value);
                          await form.trigger("api_key");
                        }}
                      />
                    )}
                  />
                </fieldset>
                <div className="mt-5 justify-end space-x-2 sm:mt-4 sm:flex rtl:space-x-reverse">
                  <Button type="button" color="secondary" onClick={() => router.back()}>
                    {t("cancel")}
                  </Button>
                  <Button
                    type="submit"
                    loading={testLoading}
                    disabled={testPassed === true}
                    StartIcon={testPassed === undefined ? undefined : testPassed ? "check" : "x"}
                    className={
                      testPassed !== undefined
                        ? testPassed
                          ? " !bg-success hover:bg-success !text-green-700"
                          : "bg-error hover:bg-error !border-red-700 !text-red-700"
                        : "secondary"
                    }
                    color={testPassed === true ? "minimal" : "secondary"}
                    onClick={async () => {
                      const check = await form.trigger("api_key");
                      if (!check) return;
                      const api_key = form.getValues("api_key");
                      setTestLoading(true);
                      const res = await fetch("/api/integrations/sendgrid/check", {
                        method: "POST",
                        body: JSON.stringify({ api_key }),
                        headers: {
                          "Content-Type": "application/json",
                        },
                      });

                      if (res.status === 200) {
                        setTestPassed(true);
                      } else {
                        setTestPassed(false);
                      }
                      setTestLoading(false);
                    }}>
                    {t(
                      testPassed !== undefined ? (testPassed ? "test_passed" : "test_failed") : "test_api_key"
                    )}
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
