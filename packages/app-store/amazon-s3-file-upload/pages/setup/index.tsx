import { useRouter } from "next/navigation";
import { useState } from "react";
import { Toaster } from "react-hot-toast";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Button, PasswordField, showToast } from "@calcom/ui";

export default function Amazons3FileUploadSetup() {
  const [newClientId, setNewClientId] = useState("");
  const [newSecretKey, setNewSecretKey] = useState("");
  const router = useRouter();
  const { t } = useLocale();
  const integrations = trpc.viewer.integrations.useQuery({
    variant: "other",
    appId: "amazon-s3-file-upload",
  });
  const [s3AppCredential] = integrations.data?.items || [];
  const [credentialId] = s3AppCredential?.userCredentialIds || [-1];

  const saveKeysMutation = trpc.viewer.appsRouter.updateAppCredentials.useMutation({
    onSuccess: () => {
      showToast(t("keys_have_been_saved"), "success");
      router.push("/event-types");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  if (integrations.isLoading) {
    return <div className="absolute z-50 flex h-screen w-full items-center bg-gray-200" />;
  }

  return (
    <div className="bg-default flex h-screen">
      <div className="bg-default border-subtle m-auto max-w-[43em] overflow-auto rounded border pb-10 md:p-10">
        <div className="ml-2 ltr:mr-2 rtl:ml-2 md:ml-5">
          <div className="invisible md:visible">
            <img
              className="h-11"
              src="/api/app-store/amazon-s3-file-upload/icon.svg"
              alt="s3 file upload Logo"
            />
            <p className="text-default mt-5 text-lg">Amazon s3 file upload</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveKeysMutation.mutate({
                credentialId,
                key: {
                  client_id: newClientId,
                  secret_key: newSecretKey,
                },
              });
            }}
            autoComplete="off"
            className="mt-5">
            <PasswordField
              label="Client Id"
              type="text"
              name="client_id"
              id="client_id"
              value={newClientId}
              onChange={(e) => setNewClientId(e.target.value)}
            />

            <PasswordField
              label="Secret Key"
              type="password"
              name="access_token"
              id="access_token"
              value={newSecretKey}
              onChange={(e) => setNewSecretKey(e.target.value)}
            />

            <div className="mt-5 flex flex-row justify-end">
              <Button type="submit" color="secondary">
                {t("save")}
              </Button>
            </div>
          </form>
          <div>
            <p className="text-lgf text-default mt-5 font-bold">Setup instructions</p>

            <ol className="text-default ml-1 list-decimal pl-2" />
          </div>
        </div>
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
}
