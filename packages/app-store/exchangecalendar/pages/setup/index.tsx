import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Toaster } from "react-hot-toast";
import z from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Select, Switch } from "@calcom/ui";
import { Alert } from "@calcom/ui/Alert";
import { EmailField, Form, Label, TextField } from "@calcom/ui/form/fields";

import { ExchangeAuthentication } from "../../enums";

export default function ExchangeSetup() {
  const { t } = useLocale();
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  const formSchema = z
    .object({
      url: z.string().url(),
      username: z.string().email(),
      password: z.string(),
      authenticationMethod: z.number(),
      useCompression: z.boolean().default(false),
    })
    .strict();

  const form = useForm<{
    url: string;
    username: string;
    password: string;
    authenticationMethod: number;
    useCompression: boolean;
  }>({
    resolver: zodResolver(formSchema),
  });

  const authenticationMethods = [
    { value: ExchangeAuthentication.STANDARD, label: t("exchange_authentication_standard") },
    { value: ExchangeAuthentication.NTLM, label: t("exchange_authentication_ntlm") },
  ];

  return (
    <>
      <div className="flex h-screen bg-gray-200">
        <div className="m-auto rounded bg-white p-5 md:w-[560px] md:p-10">
          <div className="flex flex-col space-y-5 md:flex-row md:space-y-0 md:space-x-5">
            <div className="flex">
              <img
                src="/api/app-store/exchangecalendar/icon.svg"
                alt="Microsoft Exchange Calendar"
                className="h-12 w-12 max-w-2xl"
              />
            </div>
            <div className="md:w-screen">
              <h1 className="text-gray-600">{t("exchange_add")}</h1>
              <div className="mt-1 text-sm">{t("credentials_stored_encrypted")}</div>
              <div className="my-2 mt-3">
                <Form
                  form={form}
                  handleSubmit={async (values) => {
                    setErrorMessage("");
                    const res = await fetch("/api/integrations/exchangecalendar/add", {
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
                    <Controller
                      name="url"
                      control={form.control}
                      render={({ field: { onBlur, onChange } }) => (
                        <TextField
                          type="url"
                          className="my-0"
                          onBlur={onBlur}
                          name="url"
                          placeholder="https://example.com/Ews/Exchange.asmx"
                          required
                          onChange={async (e) => {
                            onChange(e.target.value);
                            form.setValue("url", e.target.value);
                            await form.trigger("url");
                          }}
                        />
                      )}
                    />
                    <Controller
                      name="username"
                      control={form.control}
                      render={({ field: { onBlur, onChange } }) => (
                        <EmailField
                          className="my-0"
                          onBlur={onBlur}
                          name="username"
                          placeholder="john.doe@example.com"
                          required
                          onChange={async (e) => {
                            onChange(e.target.value);
                            form.setValue("username", e.target.value);
                            await form.trigger("username");
                          }}
                        />
                      )}
                    />
                    <Controller
                      name="password"
                      control={form.control}
                      render={({ field: { onBlur, onChange } }) => (
                        <TextField
                          type="password"
                          className="my-0"
                          onBlur={onBlur}
                          name="password"
                          placeholder="••••••••••••••••"
                          required
                          onChange={async (e) => {
                            onChange(e.target.value);
                            form.setValue("password", e.target.value);
                            await form.trigger("password");
                          }}
                        />
                      )}
                    />
                    <Label>{t("exchange_authentication")}</Label>
                    <Controller
                      name="authenticationMethod"
                      control={form.control}
                      render={({ field: { onChange, onBlur } }) => (
                        <Select
                          options={authenticationMethods}
                          name="authenticationMethod"
                          onBlur={onBlur}
                          onChange={async (authentication) => {
                            onChange(authentication?.value);
                            form.setValue("authenticationMethod", authentication!.value);
                            await form.trigger("authenticationMethod");
                          }}
                        />
                      )}
                    />
                  </fieldset>
                  {errorMessage && <Alert severity="error" title={errorMessage} className="my-4" />}
                  <div className="mt-5 items-center justify-between md:flex">
                    <div>
                      <Controller
                        name="useCompression"
                        control={form.control}
                        render={({ field: { onBlur } }) => (
                          <Switch
                            label={t("exchange_compression")}
                            onBlur={onBlur}
                            name="useCompression"
                            onCheckedChange={async (alt) => {
                              form.setValue("useCompression", alt);
                              await form.trigger("useCompression");
                            }}
                          />
                        )}
                      />
                    </div>
                    <div className="mt-4 space-x-2 md:mt-0">
                      <Button type="button" color="secondary" onClick={() => router.back()}>
                        {t("cancel")}
                      </Button>
                      <Button type="submit" loading={form.formState.isSubmitting}>
                        {t("save")}
                      </Button>
                    </div>
                  </div>
                </Form>
              </div>
            </div>
          </div>
        </div>
        <Toaster position="bottom-right" />
      </div>
    </>
  );
}
