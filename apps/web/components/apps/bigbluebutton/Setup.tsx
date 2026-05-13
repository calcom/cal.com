import appConfig from "@calcom/app-store/bigbluebutton/config.json";
import type { bbbOptions } from "@calcom/app-store/bigbluebutton/lib/types";
import { bbbOptionsSchema } from "@calcom/app-store/bigbluebutton/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Form, Label, PasswordField, Select, TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Toaster } from "sonner";

const bbbShaTypes = [
  { value: "sha1", label: "SHA-1" },
  { value: "sha256", label: "SHA-256" },
  { value: "sha384", label: "SHA-384" },
  { value: "sha512", label: "SHA-512" },
];

export default function BBBSetup() {
  const router = useRouter();
  const { t } = useLocale();
  const [isUpdateBtnLoading, setIsUpdateBtnLoading] = useState<boolean>(false);

  const form = useForm<bbbOptions>({
    resolver: zodResolver(bbbOptionsSchema),
    defaultValues: {
      url: "",
      secret: "",
      hash: "sha256",
    },
  });

  const {
    formState: { isDirty, isSubmitting },
  } = form;

  const isDisabled = isSubmitting || !isDirty;

  return (
    <div className="flex h-screen bg-emphasis">
      <div className="m-auto max-w-[43em] overflow-auto rounded bg-default pb-10 md:p-10">
        <div className="md:flex md:flex-row">
          <div className="invisible w-full max-w-[2.75em] md:visible">
            <img
              className="h-11"
              src={`/api/app-store/${appConfig.slug}/icon.svg`}
              alt="BigBlueButton Video"
            />
          </div>
          <div className="ml-2 md:ml-5 ltr:mr-2 rtl:ml-2">
            <div className="text-default">{t("set_up_your_bigbluebutton_integration")}</div>
            <div className="mt-1 text-xl">{t("connect_to_bigbluebutton")}</div>

            <Form
              className="mt-5"
              form={form}
              handleSubmit={async (values) => {
                setIsUpdateBtnLoading(true);
                try {
                  const res = await fetch(`/api/integrations/${appConfig.slug}/add`, {
                    method: "POST",
                    body: JSON.stringify(values),
                    headers: {
                      "Content-Type": "application/json",
                    },
                  });
                  const json = await res.json();

                  if (res.ok) {
                    showToast(t("keys_have_been_saved"), "success");
                    router.push(json.url);
                  } else {
                    showToast(json.message, "error");
                  }
                } catch {
                  showToast(t("something_went_wrong"), "error");
                } finally {
                  setIsUpdateBtnLoading(false);
                }
              }}>
              <Controller
                name="url"
                render={({ field: { value, onChange } }) => (
                  <>
                    <Label className="text-emphasis">{t("bbb_server_url")}</Label>
                    <TextField
                      required
                      type="url"
                      value={value}
                      onChange={onChange}
                      placeholder="https://example.com/bigbluebutton/api"
                    />
                  </>
                )}
              />
              <Controller
                name="secret"
                render={({ field: { value, onChange } }) => (
                  <>
                    <Label className="mt-6 text-emphasis">{t("bbb_shared_secret")}</Label>
                    <PasswordField required value={value} onChange={onChange} />
                  </>
                )}
              />

              <Controller
                name="hash"
                render={({ field: { value, onChange } }) => (
                  <>
                    <Label className="mt-6 text-emphasis">{t("bbb_checksum_algorithm")}</Label>
                    <Select<{ label: string; value: string }>
                      className="capitalize"
                      required
                      options={bbbShaTypes}
                      value={bbbShaTypes.find((option) => option.value === value)}
                      onChange={(option) => onChange(option?.value)}
                    />
                  </>
                )}
              />

              <div className="mt-5 justify-end space-x-2 sm:mt-4 sm:flex rtl:space-x-reverse">
                <Button type="button" color="secondary" onClick={() => router.back()}>
                  {t("cancel")}
                </Button>
                <Button loading={isUpdateBtnLoading} disabled={isDisabled} color="primary" type="submit">
                  {t("save")}
                </Button>
              </div>
            </Form>
            <div>
              <p className="mt-5 font-bold text-default text-lg">{t("getting_started_with_bigbluebutton")}</p>
              <p className="mt-2 font-semi text-sm">{t("connect_bigbluebutton_server_help")}</p>
              <ol className="mt-3 list-inside list-decimal space-y-2 text-default text-sm">
                <li>
                  <span>{t("run_this_command_on_your_bigbluebutton_server")}</span>
                  <div className="my-2">
                    <code className="h-full w-full whitespace-pre-wrap rounded-md bg-subtle py-[6px] pr-2 pl-2">
                      $ bbb-conf --secret
                    </code>
                  </div>
                </li>
                <li>
                  <span>{t("copy_bigbluebutton_url_and_secret_from_output")}</span>
                  <div className="my-2">
                    <code className="block h-full w-full whitespace-pre-wrap rounded-md bg-subtle py-[6px] pr-2 pl-2">
                      URL: https://example.com/bigbluebutton/api
                      {"\n"}
                      Secret: ECCJZNJWLPEA3YB6Y2LTQGQD3GJZ3F93
                    </code>
                  </div>
                </li>
                <li>
                  <span>{t("paste_bigbluebutton_credentials_and_save")}</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
}
