import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Toaster } from "sonner";
import z from "zod";

import { ExchangeAuthentication, ExchangeVersion } from "@calcom/app-store/exchangecalendar/enums";
import { emailSchema } from "@calcom/lib/emailSchema";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { EmailField } from "@calcom/ui/components/form";
import { Form } from "@calcom/ui/components/form";
import { PasswordField } from "@calcom/ui/components/form";
import { TextField } from "@calcom/ui/components/form";
import { SelectField } from "@calcom/ui/components/form";

interface IFormData {
  url: string;
  username: string;
  password: string;
  authenticationMethod: ExchangeAuthentication;
  exchangeVersion: ExchangeVersion;
  useCompression: boolean;
}

const schema = z
  .object({
    url: z.string().url(),
    username: emailSchema,
    password: z.string(),
    authenticationMethod: z.number().default(ExchangeAuthentication.STANDARD),
    exchangeVersion: z.number().default(ExchangeVersion.Exchange2016),
    useCompression: z.boolean().default(false),
  })
  .strict();

export default function ExchangeSetup() {
  const { t } = useLocale();
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const form = useForm<IFormData>({
    defaultValues: {
      authenticationMethod: ExchangeAuthentication.NTLM,
      exchangeVersion: ExchangeVersion.Exchange2016,
    },
    resolver: zodResolver(schema),
  });
  const authenticationMethod = form.watch("authenticationMethod");
  const authenticationMethods = [
    { value: ExchangeAuthentication.STANDARD, label: t("exchange_authentication_standard") },
    { value: ExchangeAuthentication.NTLM, label: t("exchange_authentication_ntlm") },
  ];
  const exchangeVersions = [
    { value: ExchangeVersion.Exchange2007_SP1, label: t("exchange_version_2007_SP1") },
    { value: ExchangeVersion.Exchange2010, label: t("exchange_version_2010") },
    { value: ExchangeVersion.Exchange2010_SP1, label: t("exchange_version_2010_SP1") },
    { value: ExchangeVersion.Exchange2010_SP2, label: t("exchange_version_2010_SP2") },
    { value: ExchangeVersion.Exchange2013, label: t("exchange_version_2013") },
    { value: ExchangeVersion.Exchange2013_SP1, label: t("exchange_version_2013_SP1") },
    { value: ExchangeVersion.Exchange2015, label: t("exchange_version_2015") },
    { value: ExchangeVersion.Exchange2016, label: t("exchange_version_2016") },
  ];

  return (
    <>
      <div className="bg-emphasis flex h-screen">
        <div className="bg-default m-auto rounded p-5 md:w-[560px] md:p-10">
          <div className="flex flex-col stack-y-5 md:flex-row md:space-x-5 md:stack-y-0">
            <div>
              {/* eslint-disable @next/next/no-img-element */}
              <img
                src="/api/app-store/exchangecalendar/icon.svg"
                alt="Microsoft Exchange"
                className="h-12 w-12 max-w-2xl"
              />
            </div>
            <div className="grow">
              <h1 className="text-default">{t("exchange_add")}</h1>
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
                  <fieldset className="stack-y-4" disabled={form.formState.isSubmitting}>
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
                      render={({ field: { onChange } }) => {
                        const ntlmAuthenticationMethod = authenticationMethods.find(
                          (method) => method.value === ExchangeAuthentication.NTLM
                        );
                        return (
                          <SelectField
                            label={t("exchange_authentication")}
                            options={authenticationMethods}
                            defaultValue={ntlmAuthenticationMethod}
                            onChange={(authentication) => {
                              if (authentication) {
                                onChange(authentication.value);
                                form.setValue("authenticationMethod", authentication.value);
                              }
                            }}
                          />
                        );
                      }}
                    />
                    {authenticationMethod === ExchangeAuthentication.STANDARD ? (
                      <Controller
                        name="exchangeVersion"
                        control={form.control}
                        render={({ field: { onChange } }) => {
                          const exchangeVersion2016 = exchangeVersions.find(
                            (exchangeVersion) => exchangeVersion.value === ExchangeVersion.Exchange2016
                          );
                          return (
                            <SelectField
                              label={t("exchange_version")}
                              options={exchangeVersions}
                              defaultValue={exchangeVersion2016}
                              onChange={(version) => {
                                onChange(version?.value);
                                if (version) {
                                  form.setValue("exchangeVersion", version.value);
                                }
                              }}
                            />
                          );
                        }}
                      />
                    ) : null}
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
