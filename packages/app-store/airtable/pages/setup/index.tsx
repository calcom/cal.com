import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Toaster } from "react-hot-toast";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Button, PasswordField, showToast, Badge } from "@calcom/ui";

import type { TAppKeysSchema } from "../../zod";

const checkIsKeyValid = async (token: string) => {
  const req = await fetch("https://api.airtable.com/v0/meta/whoami", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return req.ok;
};

type Inputs = TAppKeysSchema;

export default function AirtableSetup() {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<Inputs>();
  const router = useRouter();
  const { t } = useLocale();

  const integrations = trpc.viewer.integrations.useQuery({ variant: "other", appId: "airtable" });

  const [AirtableCredentials] = integrations.data?.items || [];
  const [credentialId] = AirtableCredentials?.userCredentialIds || [-1];
  const showContent = !!integrations.data && integrations.isSuccess && !!credentialId;

  const saveKeysMutation = trpc.viewer.appsRouter.updateAppCredentials.useMutation({
    onSuccess: () => {
      showToast(t("keys_have_been_saved"), "success");
      router.push("/event-types");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const onSubmit = async (data: Inputs) => {
    const isKeyValid = await checkIsKeyValid(data.personalAccessToken);

    if (isKeyValid) {
      saveKeysMutation.mutate({
        credentialId,
        key: data,
      });
    } else {
      showToast("invalid key", "error");
    }
  };

  if (integrations.isLoading) {
    return <div className="absolute z-50 flex h-screen w-full items-center bg-gray-200" />;
  }

  return (
    <div className="bg-default flex h-screen">
      {showContent ? (
        <div className="bg-default border-subtle m-auto max-w-[43em] overflow-auto rounded  border pb-10 md:p-10">
          <div className="w-full ">
            <form className="flex w-full flex-col" onSubmit={handleSubmit(onSubmit)}>
              <PasswordField
                {...register("personalAccessToken")}
                autoComplete="off"
                label="Airtable personal access token"
              />
              <div className="mt-5 flex flex-row justify-end">
                <Button loading={isSubmitting} type="submit" color="primary">
                  {t("save")}
                </Button>
              </div>
            </form>
          </div>
          <div>
            <ol className="mb-5 ml-5 mt-5 list-decimal ltr:mr-5 rtl:ml-5">
              <li>
                Go to{" "}
                <a className="underline underline-offset-2" href="https://airtable.com/create/tokens">
                  Airtable developer hub
                </a>
              </li>
              <li>Click create a new token button</li>
              <li>
                Create a token with the scopes <Badge>data.records:read</Badge>{" "}
                <Badge>data.records:write</Badge> <Badge>schema.bases:read</Badge>{" "}
                <Badge>schema.bases:write</Badge>
              </li>
              <li>Create your token and paste it here</li>
              <li>Click save</li>
              <li>You&apos;re set!</li>
            </ol>
          </div>
        </div>
      ) : (
        <div className="ml-5 mt-5">
          <div>{t("install_app_on_app_store", { appName: "Airtable" })}</div>
          <div className="mt-3">
            <Link href="/apps/make" passHref={true} legacyBehavior>
              <Button>{t("go_to_app_store")}</Button>
            </Link>
          </div>
        </div>
      )}

      <Toaster position="bottom-right" />
    </div>
  );
}
