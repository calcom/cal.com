import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Toaster } from "sonner";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Form, TextField } from "@calcom/ui/components/form";
import { Label } from "@calcom/ui/components/form";
import { Select } from "@calcom/ui/components/form";
import { PasswordField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import metadata from "../../_metadata";
import type { bbbOptions } from "../../lib/types";
import { bbbOptionsSchema } from "../../lib/types";

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
    <div className="bg-emphasis flex h-screen">
      <div className="bg-default m-auto max-w-[43em] overflow-auto rounded pb-10 md:p-10">
        <div className="md:flex md:flex-row">
          <div className="invisible w-full max-w-[2.75em] md:visible">
            <img
              className="h-11"
              src={`/api/app-store/${metadata.slug}/icon.svg`}
              alt="BigBlueButton Video"
            />
          </div>
          <div className="ml-2 ltr:mr-2 rtl:ml-2 md:ml-5">
            <div className="text-default">{t("set_up_your_integration", { appName: "BigBlueButton" })}</div>
            <div className="mt-1 text-xl">{t("connect_to_app", { appName: "BigBlueButton" })}</div>

            <Form
              className="mt-5"
              form={form}
              handleSubmit={async (values) => {
                setIsUpdateBtnLoading(true);
                try {
                  const res = await fetch(`/api/integrations/${metadata.slug}/add`, {
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
                    <Label className="text-emphasis">{t("server_url")}</Label>
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
                    <Label className="text-emphasis mt-6">{t("shared_secret")}</Label>
                    <PasswordField required value={value} onChange={onChange} />
                  </>
                )}
              />

              <Controller
                name="hash"
                render={({ field: { value, onChange } }) => (
                  <>
                    <Label className="text-emphasis mt-6">{t("checksum_algorithm")}</Label>
                    <Select<{ label: string; value: string }>
                      className="capitalize"
                      required
                      options={bbbShaTypes}
                      // hacky way to make it work
                      value={bbbShaTypes.find((option) => option.value === value)}
                      onChange={(option) => onChange(option?.value)}
                    />
                  </>
                )}
              />

              <div className="mt-5 justify-end space-x-2 rtl:space-x-reverse sm:mt-4 sm:flex">
                <Button type="button" color="secondary" onClick={() => router.back()}>
                  {t("cancel")}
                </Button>
                <Button loading={isUpdateBtnLoading} disabled={isDisabled} color="primary" type="submit">
                  {t("save")}
                </Button>
              </div>
            </Form>
            <div>
              <p className="text-lg text-default mt-5 font-bold">{t("getting_started_with_app", { appName: "BigBlueButton" })}</p>
              <p className="font-semi mt-2 text-sm">
                To connect your BigBlueButton server, you&apos;ll need your API endpoint and shared secret.
              </p>
              <ol className="text-default mt-3 list-inside list-decimal space-y-2 text-sm">
                <li>
                  <span>Run this command on your BigBlueButton server:</span>
                  <div className="my-2">
                    <code className="bg-subtle h-full w-full whitespace-pre-wrap rounded-md py-[6px] pl-2 pr-2">
                      $ bbb-conf --secret
                    </code>
                  </div>
                </li>
                <li>
                  <span>
                    Copy the <b>URL</b> and <b>Secret</b> from the output. Example:
                  </span>
                  <div className="my-2">
                    <code className="bg-subtle block h-full w-full whitespace-pre-wrap rounded-md py-[6px] pl-2 pr-2">
                      URL: https://example.com/bigbluebutton/api
                      {"\n"}
                      Secret: ECCJZNJWLPEA3YB6Y2LTQGQD3GJZ3F93
                    </code>
                  </div>
                </li>
                <li>
                  <span>
                    Paste them in the fields above, select the signature algorithm, and save to finish setup.
                  </span>
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
