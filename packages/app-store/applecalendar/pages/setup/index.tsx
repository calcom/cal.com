import { useRouter } from "next/router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Toaster } from "react-hot-toast";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/Alert";
import Button from "@calcom/ui/Button";
import { Form, TextField } from "@calcom/ui/form/fields";

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
    <div className="flex h-screen bg-gray-200">
      <div className="m-auto rounded bg-white p-5 md:w-[560px] md:p-10">
        <div className="flex flex-col space-y-5 md:flex-row md:space-y-0 md:space-x-5">
          <div>
            {/* eslint-disable @next/next/no-img-element */}
            <img
              src="/api/app-store/applecalendar/icon.svg"
              alt="Apple Calendar"
              className="h-12 w-12 max-w-2xl"
            />
          </div>
          <div>
            <h1 className="text-gray-600">Connect to Apple Server</h1>

            <div className="mt-1 text-sm">
              Generate an app specific password to use with Cal.com at{" "}
              <a
                className="text-indigo-400"
                href="https://appleid.apple.com/account/manage"
                target="_blank"
                rel="noopener noreferrer">
                https://appleid.apple.com/account/manage
              </a>
              . Your credentials will be stored and encrypted.
            </div>
            <div className="my-2 mt-3">
              <Form
                form={form}
                handleSubmit={async (values) => {
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
                    setErrorMessage(json?.message || "Something went wrong");
                  } else {
                    router.push(json.url);
                  }
                }}>
                <fieldset className="space-y-2" disabled={form.formState.isSubmitting}>
                  <TextField
                    required
                    type="text"
                    {...form.register("username")}
                    label="Username"
                    placeholder="rickroll"
                  />
                  <TextField
                    required
                    type="password"
                    {...form.register("password")}
                    label="Password"
                    placeholder="•••••••••••••"
                    autoComplete="password"
                  />
                </fieldset>

                {errorMessage && <Alert severity="error" title={errorMessage} className="my-4" />}
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <Button type="submit" loading={form.formState.isSubmitting}>
                    Save
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
