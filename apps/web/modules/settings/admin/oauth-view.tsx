"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { Form } from "@calcom/ui/components/form";
import { Label } from "@calcom/ui/components/form";
import { Switch } from "@calcom/ui/components/form";
import { TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { ImageUploader } from "@calcom/ui/components/image-uploader";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";

type FormValues = {
  name: string;
  redirectUri: string;
  logo: string;
  enablePkce: boolean;
};

export default function OAuthView() {
  const oAuthForm = useForm<FormValues>({
    defaultValues: {
      logo: "",
      enablePkce: false,
    },
  });
  const [clientSecret, setClientSecret] = useState("");
  const [clientId, setClientId] = useState("");
  const [logo, setLogo] = useState("");
  const { t } = useLocale();

  const mutation = trpc.viewer.oAuth.addClient.useMutation({
    onSuccess: async (data) => {
      setClientSecret(data.clientSecret || "");
      setClientId(data.clientId);
      showToast(`Successfully added ${data.name} as new client`, "success");
    },
    onError: (error) => {
      showToast(`Adding client failed: ${error.message}`, "error");
    },
  });

  return (
    <div>
      {!clientId ? (
        <Form
          form={oAuthForm}
          handleSubmit={(values) => {
            mutation.mutate({
              name: values.name,
              redirectUri: values.redirectUri,
              logo: values.logo,
              enablePkce: values.enablePkce,
            });
          }}>
          <div className="">
            <TextField
              {...oAuthForm.register("name")}
              label="Client name"
              type="text"
              id="name"
              placeholder=""
              className="mb-3"
              required
            />
            <TextField
              {...oAuthForm.register("redirectUri")}
              label="Redirect URI"
              type="text"
              id="redirectUri"
              placeholder=""
              required
            />

            <div className="mb-5 mt-5">
              <Label className="text-emphasis mb-2 block text-sm font-medium">Authentication Mode</Label>
              <div className="flex items-center space-x-3">
                <Switch 
                  checked={oAuthForm.watch("enablePkce")}
                  onCheckedChange={(checked) => oAuthForm.setValue("enablePkce", checked)}
                />
                <span className="text-default text-sm">
                  Use PKCE (recommended for mobile/SPA applications)
                </span>
              </div>
            </div>

            <div className="mb-5 mt-5 flex items-center">
              <Avatar
                alt=""
                fallback={<Icon name="plus" className="text-subtle h-6 w-6" />}
                className="mr-5 items-center"
                imageSrc={logo}
                size="lg"
              />
              <ImageUploader
                target="avatar"
                id="avatar-upload"
                buttonMsg="Upload Logo"
                handleAvatarChange={(newLogo: string) => {
                  setLogo(newLogo);
                  oAuthForm.setValue("logo", newLogo);
                }}
                imageSrc={logo}
              />
            </div>
          </div>
          <Button type="submit" className="mt-3">
            {t("add_client")}
          </Button>
        </Form>
      ) : (
        <div>
          <div className="text-emphasis mb-5 text-xl font-semibold">{oAuthForm.getValues("name")}</div>
          <div className="mb-2 font-medium">{t("client_id")}</div>
          <div className="flex">
            <code className="bg-subtle text-default w-full truncate rounded-md rounded-r-none py-[6px] pl-2 pr-2 align-middle font-mono">
              {clientId}
            </code>
            <Tooltip side="top" content="Copy to Clipboard">
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(clientId);
                  showToast(t("client_id_copied"), "success");
                }}
                type="button"
                className="rounded-l-none text-base"
                StartIcon="clipboard">
                {t("copy")}
              </Button>
            </Tooltip>
          </div>
          {clientSecret ? (
            <>
              <div className="mb-2 mt-4 font-medium">{t("client_secret")}</div>
              <div className="flex">
                <code className="bg-subtle text-default w-full truncate rounded-md rounded-r-none py-[6px] pl-2 pr-2 align-middle font-mono">
                  {clientSecret}
                </code>
                <Tooltip side="top" content="Copy to Clipboard">
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(clientSecret);
                      setClientSecret("");
                      showToast(t("client_secret_copied"), "success");
                    }}
                    type="button"
                    className="rounded-l-none text-base"
                    StartIcon="clipboard">
                    {t("copy")}
                  </Button>
                </Tooltip>
              </div>
              <div className="text-subtle text-sm">{t("copy_client_secret_info")}</div>
            </>
          ) : (
            <div className="text-subtle mt-4 text-sm">
              This client uses PKCE authentication (no client secret required).
            </div>
          )}
          <Button
            onClick={() => {
              setClientId("");
              setLogo("");
              oAuthForm.reset();
            }}
            className="mt-5">
            {t("add_new_client")}
          </Button>
        </div>
      )}
    </div>
  );
}
