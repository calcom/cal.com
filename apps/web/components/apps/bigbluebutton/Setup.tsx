"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Trans } from "next-i18next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { appKeysSchema } from "@calcom/app-store/bigbluebutton/zod";
import type { AppKeys } from "@calcom/app-store/bigbluebutton/zod";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Form, TextField, SelectField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

export default function BigBlueButtonSetup() {
  const { t } = useLocale();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Build checksum options with localized labels so translators can adapt them
  // per locale (e.g. different parenthetical notes for recommended/legacy status).
  const CHECKSUM_OPTIONS = [
    { value: "sha256", label: t("bigbluebutton_checksum_sha256") },
    { value: "sha512", label: t("bigbluebutton_checksum_sha512") },
    { value: "sha384", label: t("bigbluebutton_checksum_sha384") },
    { value: "sha1",   label: t("bigbluebutton_checksum_sha1") },
  ] as const;

  const form = useForm<AppKeys>({
    resolver: zodResolver(appKeysSchema),
    defaultValues: {
      serverUrl: "",
      sharedSecret: "",
      checksumAlgorithm: "sha256",
    },
  });

  const onSubmit = async (data: AppKeys) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/integrations/bigbluebutton/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await response.json();

      if (!response.ok) {
        showToast(json.message ?? t("something_went_wrong"), "error");
        return;
      }

      showToast(t("bigbluebutton_connected"), "success");
      router.push("/apps/installed/conferencing");
    } catch (_error) {
      showToast(t("something_went_wrong"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-default flex flex-col items-center p-4">
      <div className="bg-default border-subtle w-full max-w-2xl rounded-md border p-8">
        <h1 className="font-cal text-emphasis mb-1 text-xl font-medium">{t("bigbluebutton_setup")}</h1>
        <p className="text-default mb-6 text-sm">{t("bigbluebutton_setup_description")}</p>

        <Form form={form} handleSubmit={onSubmit}>
          <div className="flex flex-col space-y-4">
            <TextField
              label={t("bigbluebutton_server_url")}
              placeholder="https://bbb.example.com/bigbluebutton"
              {...form.register("serverUrl")}
              hint={t("bigbluebutton_server_url_hint")}
            />

            <TextField
              label={t("bigbluebutton_shared_secret")}
              type="password"
              placeholder={t("bigbluebutton_shared_secret_placeholder")}
              {...form.register("sharedSecret")}
              hint={t("bigbluebutton_shared_secret_hint")}
            />

            <SelectField
              label={t("bigbluebutton_checksum_algorithm")}
              options={CHECKSUM_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              onChange={(option) => {
                if (option)
                  form.setValue("checksumAlgorithm", option.value as AppKeys["checksumAlgorithm"]);
              }}
              defaultValue={CHECKSUM_OPTIONS[0]}
            />

            <div className="mt-2 flex items-center justify-end space-x-2">
              <Button
                color="minimal"
                onClick={() => router.push("/apps")}
                disabled={isLoading}
                type="button">
                {t("cancel")}
              </Button>
              <Button type="submit" loading={isLoading}>
                {t("save")}
              </Button>
            </div>
          </div>
        </Form>

        {/* Single Trans key prevents word-order issues for non-English locales.
            The <1>…</1> placeholder in the translation maps to the <a> element,
            allowing translators to position the link anywhere in their sentence. */}
        <p className="text-subtle mt-4 text-xs">
          <Trans
            i18nKey="bigbluebutton_setup_help"
            t={t}
            components={[
              // index 0 unused (Trans starts component refs at 1 for non-text children)
              <span key="0" />,
              <a
                key="1"
                href="https://docs.bigbluebutton.org/development/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emphasis underline"
              />,
            ]}
          />
        </p>
      </div>
    </div>
  );
}
