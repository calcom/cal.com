import { useRouter } from "next/navigation";
import { useState } from "react";
import { Toaster } from "react-hot-toast";

import AppNotInstalledMessage from "@calcom/app-store/_components/AppNotInstalledMessage";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Button, showToast, TextField } from "@calcom/ui";

export default function PipeDriveSetup() {
  const [newClientId, setNewClientId] = useState("");
  const [newSecretKey, setNewSecretKey] = useState("");
  const router = useRouter();
  const { t } = useLocale();
  const integrations = trpc.viewer.integrations.useQuery({ variant: "crm", appId: "pipedrive-crm" });
  const [pipedrivePaymentAppCredentials] = integrations.data?.items || [];
  const [credentialId] = pipedrivePaymentAppCredentials?.userCredentialIds || [-1];
  const showContent = !!integrations.data && integrations.isSuccess && !!credentialId;

  const saveKeysMutation = trpc.viewer.appsRouter.updateAppCredentials.useMutation({
    onSuccess: () => {
      showToast(t("keys_have_been_saved"), "success");
      fetch("/api/integrations/pipedrive-crm/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((res) => {
          if (res.ok) {
            return res.json();
          }
        })
        .then((data) => {
          router.push(data.url);
        });
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  if (integrations.isPending) {
    return <div className="absolute z-50 flex h-screen w-full items-center bg-gray-200" />;
  }

  return (
    <div className="bg-default flex h-screen">
      {showContent ? (
        <div className="bg-default border-subtle m-auto max-w-[43em] overflow-auto rounded border pb-10 md:p-10">
          <div className="ml-2 ltr:mr-2 rtl:ml-2 md:ml-5">
            <div className="invisible md:visible">
              <img
                className="h-11"
                src="/api/app-store/pipedrive-crm/icon.svg"
                alt="Pipedrive Payment Logo"
              />
              <p className="text-default mt-5 text-lg">PipeDrive</p>
            </div>
            <form autoComplete="off" className="mt-5">
              <TextField
                label="Client Id"
                type="text"
                name="client_id"
                id="client_id"
                value={newClientId}
                onChange={(e) => setNewClientId(e.target.value)}
                role="presentation"
              />

              <TextField
                label="Secret Key"
                type="password"
                name="access_token"
                id="access_token"
                value={newSecretKey}
                autoComplete="new-password"
                role="presentation"
                onChange={(e) => setNewSecretKey(e.target.value)}
              />

              {/* Button to submit */}
              <div className="mt-5 flex flex-row justify-end">
                <Button
                  color="secondary"
                  onClick={() => {
                    saveKeysMutation.mutate({
                      credentialId,
                      key: {
                        client_id: newClientId,
                        secret_key: newSecretKey,
                      },
                    });
                  }}>
                  {t("save")}
                </Button>
              </div>
            </form>
            <div>
              <a
                className="text-orange-600 underline"
                target="_blank"
                href="https://pipedrive.readme.io/docs/marketplace-oauth-authorization">
                Link to Pipedrive developer OAuth Setup Guide:
                https://pipedrive.readme.io/docs/marketplace-oauth-authorization
              </a>

              <p className="text-lgf text-default mt-5 font-bold">Setup instructions</p>
              <p className="text-default font-semi mt-2">
                Remember to only proceed with the following steps if you have developer access to your
                account.
              </p>

              <ol className="text-default ml-1 mt-5 list-decimal pl-2">
                {/* @TODO: translate */}
                <li>Log into your Pipedrive account and in the Developer Hub select/create your app.</li>
                <li>
                  {`Under the Basic Info Tab, change the Callback URL to: ${WEBAPP_URL} /api/integrations/pipedrive-crm/callback`}
                </li>
                <li>In the OAuth & access scopes Tab, enable full access to Activities and Contacts</li>
                <li>
                  In the same OAuth & access scopes Tab, copy the Client ID and Client secret, be sure to keep
                  these secured, as you won&apos;t be able to see the secret again.
                </li>
                <li>
                  Paste the Client ID and Secret Key on the required field above and save them. You should be
                  redirected to a Pipedrive page after saving to confirm installation.
                </li>
                <li>All done! You should be all setup after this.</li>
              </ol>
            </div>
          </div>
        </div>
      ) : (
        <AppNotInstalledMessage appName="pipedrive-crm" />
      )}
      <Toaster position="bottom-right" />
    </div>
  );
}
