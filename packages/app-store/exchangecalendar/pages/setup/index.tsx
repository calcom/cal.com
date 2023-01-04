import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Toaster } from "react-hot-toast";
import z from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert, Button, EmailField, Form, PasswordField, SelectField, Switch, TextField } from "@calcom/ui";

import { ExchangeAuthentication } from "../../enums";

interface IFormData {
  url: string;
  username: string;
  password: string;
  authenticationMethod: ExchangeAuthentication;
  useCompression: boolean;
}

const schema = z
  .object({
    url: z.string().url(),
    username: z.string().email(),
    password: z.string(),
    authenticationMethod: z.number().default(ExchangeAuthentication.STANDARD),
    useCompression: z.boolean().default(false),
  })
  .strict();

export default function ExchangeSetup() {
  const { t } = useLocale();
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const form = useForm<IFormData>({
    defaultValues: { authenticationMethod: ExchangeAuthentication.STANDARD },
    resolver: zodResolver(schema),
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
            <div>
              {/* eslint-disable @next/next/no-img-element */}
              <img
                src="/api/app-store/exchangecalendar/icon.svg"
                alt="Microsoft Exchange"
                className="h-12 w-12 max-w-2xl"
              />
            </div>
            <div className="grow">
              <h1 className="text-gray-600">{t("exchange_add")}</h1>
              <div className="text-sm">{t("credentials_stored_encrypted")}</div>
              <div className="my-2 mt-5">
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
                  <fieldset className="space-y-4" disabled={form.formState.isSubmitting}>
                    <TextField
                      required
                      type="url"
                      {...form.register("url")}
                      label={t("url")}
                      placeholder="https://example.com/Ews/Exchange.asmx"
                      inputMode="url"
                    />
                    <EmailField
                      required
                      {...form.register("username")}
                      label={t("email_address")}
                      placeholder="john.doe@example.com"
                    />
                    <PasswordField
                      required
                      {...form.register("password")}
                      label={t("password")}
                      autoComplete="password"
                    />
                    <Controller
                      name="authenticationMethod"
                      control={form.control}
                      render={({ field: { onChange } }) => (
                        <SelectField
                          label={t("exchange_authentication")}
                          options={authenticationMethods}
                          defaultValue={authenticationMethods[0]}
                          onChange={async (authentication) => {
                            onChange(authentication?.value);
                            form.setValue("authenticationMethod", authentication!.value);
                          }}
                        />
                      )}
                    />
                    <Switch
                      label={t("exchange_compression")}
                      name="useCompression"
                      onCheckedChange={async (alt) => {
                        form.setValue("useCompression", alt);
                      }}
                    />
                  </fieldset>
                  {errorMessage && <Alert severity="error" title={errorMessage} className="my-4" />}
                  <div className="mt-4 flex justify-end space-x-2 rtl:space-x-reverse">
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
    </>
  );
}
