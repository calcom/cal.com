import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Toaster } from "react-hot-toast";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert, Button, Form, PasswordField, SelectField, TextField } from "@calcom/ui";

import appConfig from "../../config.json";
import type { BbbOptions } from "../../lib/bbbApi";
import { bbbOptionsSchema } from "../../lib/bbbApi";

export default function ExchangeSetup() {
  const { t } = useLocale();
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const form = useForm<BbbOptions>({
    defaultValues: {
      url: "",
      secret: "",
      hash: "sha1",
    },
    resolver: zodResolver(bbbOptionsSchema),
  });
  const hashes: { value: BbbOptions["hash"]; label: string }[] = [
    { value: "sha1", label: "sha1" },
    { value: "sha256", label: "sha256" },
    { value: "sha384", label: "sha384" },
    { value: "sha512", label: "sha512" },
  ];
  const { slug } = appConfig;

  return (
    <>
      <div className="bg-emphasis flex h-screen">
        <div className="bg-default m-auto rounded p-5 md:w-[560px] md:p-10">
          <div className="flex flex-col space-y-5 md:flex-row md:space-x-5 md:space-y-0">
            <div>
              {/* eslint-disable @next/next/no-img-element */}
              <img
                src={`/api/app-store/${slug}/icon.svg`}
                alt="Microsoft Exchange"
                className="h-12 w-12 max-w-2xl"
              />
            </div>
            <div className="grow">
              <h1 className="text-default">
                {t("connect")} {appConfig.name}
              </h1>
              <div className="text-sm">{t("credentials_stored_encrypted")}</div>
              <div className="my-2 mt-5">
                <Form
                  form={form}
                  handleSubmit={async (values) => {
                    setErrorMessage("");
                    const res = await fetch(`/api/integrations/${slug}/add`, {
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
                      placeholder="https://bbb.example.com/bigbluebutton/api/"
                      inputMode="url"
                    />
                    <PasswordField
                      required
                      {...form.register("secret")}
                      label={t("secret")}
                      autoComplete="password"
                    />
                    <Controller
                      name="hash"
                      control={form.control}
                      render={({ field: { onChange } }) => (
                        <SelectField
                          required
                          label={t("hash_algorithm")}
                          options={hashes}
                          defaultValue={hashes[0]}
                          onChange={async (hash) => {
                            if (hash) {
                              onChange(hash.value);
                              form.setValue("hash", hash.value);
                            }
                          }}
                        />
                      )}
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
