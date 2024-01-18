"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Meta, Form, Button, TextField, showToast, Tooltip, ImageUploader, Avatar } from "@calcom/ui";
import { Clipboard } from "@calcom/ui/components/icon";
import { Plus } from "@calcom/ui/components/icon";

type FormValues = {
  name: string;
  redirectUri: string;
  logo: string;
};

export default function OAuthView() {
  const oAuthForm = useForm<FormValues>();
  const [clientSecret, setClientSecret] = useState("");
  const [clientId, setClientId] = useState("");
  const [logo, setLogo] = useState("");
  const { t } = useLocale();

  const mutation = trpc.viewer.oAuth.addClient.useMutation({
    onSuccess: async (data) => {
      setClientSecret(data.clientSecret);
      setClientId(data.clientId);
      showToast(`Successfully added ${data.name} as new client`, "success");
    },
    onError: (error) => {
      showToast(`Adding clientfailed: ${error.message}`, "error");
    },
  });

  return (
    <div>
      <Meta title="OAuth" description="Add new OAuth Clients" />
      {!clientId ? (
        <Form
          form={oAuthForm}
          handleSubmit={(values) => {
            mutation.mutate({
              name: values.name,
              redirectUri: values.redirectUri,
              logo: values.logo,
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
            <div className="mb-5 mt-5 flex items-center">
              <Avatar
                alt=""
                fallback={<Plus className="text-subtle h-6 w-6" />}
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
          <div className="mb-2 font-medium">Client Id</div>
          <div className="flex">
            <code className="bg-subtle text-default w-full truncate rounded-md rounded-r-none py-[6px] pl-2 pr-2 align-middle font-mono">
              {" "}
              {clientId}
            </code>
            <Tooltip side="top" content="Copy to Clipboard">
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(clientId);
                  showToast("Client ID copied!", "success");
                }}
                type="button"
                className="rounded-l-none text-base"
                StartIcon={Clipboard}>
                {t("copy")}
              </Button>
            </Tooltip>
          </div>
          {clientSecret ? (
            <>
              <div className="mb-2 mt-4 font-medium">Client Secret</div>
              <div className="flex">
                <code className="bg-subtle text-default w-full truncate rounded-md rounded-r-none py-[6px] pl-2 pr-2 align-middle font-mono">
                  {" "}
                  {clientSecret}
                </code>
                <Tooltip side="top" content="Copy to Clipboard">
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(clientSecret);
                      setClientSecret("");
                      showToast("Client secret copied!", "success");
                    }}
                    type="button"
                    className="rounded-l-none text-base"
                    StartIcon={Clipboard}>
                    {t("copy")}
                  </Button>
                </Tooltip>
              </div>
              <div className="text-subtle text-sm">{t("copy_client_secret_info")}</div>
            </>
          ) : (
            <></>
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
