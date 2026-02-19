import { zodResolver } from "@hookform/resolvers/zod";
import { Trans } from "next-i18next";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Form, TextField, SelectField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import { appKeysSchema, type AppKeys } from "../../zod";

export default function BigBlueButtonSetup() {
  const { t } = useLocale();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Build checksum options using translated labels so they can be localized.
  // Previously hardcoded English labels broke word order for non-English locales.
  const checksumOptions = useMemo(
    () => [
      { value: "sha256" as const, label: t("bigbluebutton_checksum_sha256") },
      { value: "sha512" as const, label: t("bigbluebutton_checksum_sha512") },
      { value: "sha384" as const, label: t("bigbluebutton_checksum_sha384") },
      { value: "sha1" as const, label: t("bigbluebutton_checksum_sha1") },
    ],
    [t]
  );

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
    } catch (error) {
      showToast(t("something_went_wrong"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-default flex flex-col items-center p-4">
      <div className="bg-default border-subtle w-full max-w-2xl rounded-md border p-8">
        <h1 className="font-cal text-emphasis mb-1 text-xl font-medium">{t("bigbluebutton_setup")}</h1>
        <p className="text-default mb-6 text-sm">
          {t("bigbluebutton_setup_description")}
        </p>

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
              options={checksumOptions}
              onChange={(option) => {
                if (option) form.setValue("checksumAlgorithm", option.value as AppKeys["checksumAlgorithm"]);
              }}
              defaultValue={checksumOptions[0]}
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
