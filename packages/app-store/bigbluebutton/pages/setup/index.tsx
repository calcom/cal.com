import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Toaster } from "sonner";

import AppNotInstalledMessage from "@calcom/app-store/_components/AppNotInstalledMessage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Button } from "@calcom/ui/components/button";
import { Form, TextField } from "@calcom/ui/components/form";
import { Label } from "@calcom/ui/components/form";
import { Select } from "@calcom/ui/components/form";
import { PasswordField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import metadata from "../../_metadata";
import type { bbbOptions } from "../../lib/types";
import { bbbOptionsSchema } from "../../lib/types";

// this is practically a copy of the paypal setup page and the general view page from the settings

const bbbShaTypes = [
  { value: "sha1", label: "SHA-1" },
  { value: "sha256", label: "SHA-256" },
  { value: "sha384", label: "SHA-384" },
  { value: "sha512", label: "SHA-512" },
];

export default function BBBSetup() {
  const [isUpdateBtnLoading, setIsUpdateBtnLoading] = useState<boolean>(false);

  const router = useRouter();
  const { t } = useLocale();
  const integrations = trpc.viewer.apps.integrations.useQuery({
    variant: "conference",
    appId: "bigbluebutton",
  });
  const [appCredentials] = integrations.data?.items || [];
  const [credentialId] = appCredentials?.userCredentialIds || [-1];
  const showContent = !!integrations.data && integrations.isSuccess && !!credentialId;

  const form = useForm<bbbOptions>({
    resolver: zodResolver(bbbOptionsSchema),
  });

  const {
    formState: { isDirty, isSubmitting },
  } = form;

  const isDisabled = isSubmitting || !isDirty;

  if (integrations.isPending) {
    return <div className="bg-emphasis absolute z-50 flex h-screen w-full items-center" />;
  }

  return (
    <div className="bg-emphasis flex h-screen">
      {showContent ? (
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
              <div className="text-default">Set up your BigBlueButton integration</div>
              <div className="mt-1 text-xl">Connect to BigBlueButton:</div>

              <Form
                className="mt-5"
                form={form}
                handleSubmit={async (values) => {
                  setIsUpdateBtnLoading(true);
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
                    setIsUpdateBtnLoading(false);
                    showToast(json.message, "error");
                  }
                }}>
                <Controller
                  name="url"
                  render={({ field: { value, onChange } }) => (
                    <>
                      <Label className="text-emphasis">Server URL</Label>
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
                      <Label className="text-emphasis mt-6">Shared secret</Label>
                      <PasswordField required value={value} onChange={onChange} />
                    </>
                  )}
                />

                <Controller
                  name="hash"
                  render={({ field: { value, onChange } }) => (
                    <>
                      <Label className="text-emphasis mt-6">Checksum algorithm</Label>
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
                    <>{t("save")}</>
                  </Button>
                </div>
              </Form>
              <div>
                <p className="text-lgf text-default mt-5 font-bold">Getting started with BigBlueButton</p>
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
                      Paste them in the fields above, select the signature algorithm, and save to finish
                      setup.
                    </span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <AppNotInstalledMessage appName="bigbluebutton" />
      )}
      <Toaster position="bottom-right" />
    </div>
  );
}
