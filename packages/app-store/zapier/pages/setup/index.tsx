import { Trans } from "next-i18next";
import Link from "next/link";
import { useState } from "react";
import { Toaster } from "react-hot-toast";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { ClipboardCopyIcon } from "@calcom/ui/Icon";
import { Button } from "@calcom/ui/components";
import { showToast, Tooltip } from "@calcom/ui/v2";

export interface IZapierSetupProps {
  inviteLink: string;
}

const ZAPIER = "zapier";

export default function ZapierSetup(props: IZapierSetupProps) {
  const [newApiKey, setNewApiKey] = useState("");
  const { t } = useLocale();
  const utils = trpc.useContext();
  const integrations = trpc.useQuery(["viewer.integrations", { variant: "automation" }]);
  const oldApiKey = trpc.useQuery(["viewer.apiKeys.findKeyOfType", { appId: ZAPIER }]);

  const deleteApiKey = trpc.useMutation("viewer.apiKeys.delete");
  const zapierCredentials: { credentialIds: number[] } | undefined = integrations.data?.items.find(
    (item: { type: string }) => item.type === "zapier_automation"
  );
  const [credentialId] = zapierCredentials?.credentialIds || [false];
  const showContent = integrations.data && integrations.isSuccess && credentialId;
  const isCalDev = process.env.NEXT_PUBLIC_WEBAPP_URL === "https://app.cal.dev";

  async function createApiKey() {
    const event = { note: "Zapier", expiresAt: null, appId: ZAPIER };
    const apiKey = await utils.client.mutation("viewer.apiKeys.create", event);
    if (oldApiKey.data) {
      deleteApiKey.mutate({
        id: oldApiKey.data.id,
      });
    }
    setNewApiKey(apiKey);
  }

  if (integrations.isLoading) {
    return <div className="absolute z-50 flex h-screen w-full items-center bg-gray-200" />;
  }

  return (
    <div className="flex h-screen bg-gray-200">
      {showContent ? (
        <div className="m-auto max-w-[43em] overflow-auto rounded bg-white pb-10 md:p-10">
          <div className="md:flex md:flex-row">
            <div className="invisible md:visible">
              <img className="h-11" src="/api/app-store/zapier/icon.svg" alt="Zapier Logo" />
            </div>
            <div className="ml-2 mr-2 md:ml-5">
              <div className="text-gray-600">{t("setting_up_zapier")}</div>
              {!newApiKey ? (
                <>
                  <div className="mt-1 text-xl">{t("generate_api_key")}:</div>
                  <Button onClick={() => createApiKey()} className="mt-4 mb-4">
                    {t("generate_api_key")}
                  </Button>
                </>
              ) : (
                <>
                  <div className="mt-1 text-xl">{t("your_unique_api_key")}</div>
                  <div className="my-2 mt-3 flex-wrap sm:flex sm:flex-nowrap">
                    <code className="h-full w-full whitespace-pre-wrap rounded-md bg-gray-100 py-2 pl-2 pr-2 sm:rounded-r-none sm:pr-5">
                      {newApiKey}
                    </code>
                    <Tooltip side="top" content={t("copy_to_clipboard")}>
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(newApiKey);
                          showToast(t("api_key_copied"), "success");
                        }}
                        type="button"
                        className="mt-4 text-base sm:mt-0 sm:rounded-l-none">
                        <ClipboardCopyIcon className="mr-2 h-5 w-5 text-neutral-100" />
                        {t("copy")}
                      </Button>
                    </Tooltip>
                  </div>
                  <div className="mt-2 mb-5 text-sm font-semibold text-gray-600">
                    {t("copy_safe_api_key")}
                  </div>
                </>
              )}

              <ol className="mt-5 mb-5 ml-5 mr-5 list-decimal">
                {isCalDev && (
                  <li>
                    {t("go_to")}
                    <a href={props.inviteLink} className="text-orange-600 underline">
                      {t("zapier_invite_link")}
                    </a>
                  </li>
                )}
                <Trans i18nKey="zapier_setup_instructions">
                  <li>Log into your Zapier account and create a new Zap.</li>
                  <li>Select Cal.com as your Trigger app. Also choose a Trigger event.</li>
                  <li>Choose your account and then enter your Unique API Key.</li>
                  <li>Test your Trigger.</li>
                  <li>You&apos;re set!</li>
                </Trans>
              </ol>
              <Link href="/apps/installed" passHref={true}>
                <Button color="secondary">{t("done")}</Button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 ml-5">
          <div>{t("install_zapier_app")}</div>
          <div className="mt-3">
            <Link href="/apps/zapier" passHref={true}>
              <Button>{t("go_to_app_store")}</Button>
            </Link>
          </div>
        </div>
      )}
      <Toaster position="bottom-right" />
    </div>
  );
}
