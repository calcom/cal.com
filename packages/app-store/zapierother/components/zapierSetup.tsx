import { ClipboardCopyIcon } from "@heroicons/react/solid";
import { ApiKeyType } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

import showToast from "@calcom/lib/notification";
import { Button } from "@calcom/ui";

import Loader from "../../../../apps/web/components/Loader";
import { Tooltip } from "../../../../apps/web/components/Tooltip";
import Icon from "./icon";
import { useLocale } from "@calcom/lib/hooks/useLocale";

interface IZapierSetupProps {
  trpc: any;
}

export default function ZapierSetup(props: IZapierSetupProps) {
  const { trpc } = props;
  const router = useRouter();
  const [newApiKey, setNewApiKey] = useState("");
  const { t } = useLocale();
  const utils = trpc.useContext();
  const integrations = trpc.useQuery(["viewer.integrations"]);
  const oldApiKey = trpc.useQuery(["viewer.apiKeys.findKeyOfType", { apiKeyType: ApiKeyType.ZAPIER }]);
  const deleteApiKey = trpc.useMutation("viewer.apiKeys.delete");
  const zapierCredentials: { credentialIds: number[] } | undefined = integrations.data?.other?.items.find(
    (item: { type: string }) => item.type === "zapier_other"
  );
  const [credentialId] = zapierCredentials?.credentialIds || [false];
  const showContent = integrations.data && integrations.isSuccess && credentialId;

  async function createApiKey() {
    const event = { note: "Zapier", expiresAt: null, apiKeyType: ApiKeyType.ZAPIER };
    const apiKey = await utils.client.mutation("viewer.apiKeys.create", event);
    if (oldApiKey.data) {
      deleteApiKey.mutate({
        id: oldApiKey.data.id,
      });
    }
    setNewApiKey(apiKey);
  }

  if (integrations.isLoading) {
    return (
      <div className="absolute z-50 flex items-center w-full h-screen bg-gray-200">
        <Loader />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-200">
      {showContent ? (
        <div className="p-10 m-auto bg-white rounded">
          <div className="flex flex-row">
            <div className="mr-5">
              <Icon />
            </div>
            <div className="ml-5">
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
                  <div className="flex my-2 mt-3">
                    <div className="w-full p-3 pr-5 mr-1 bg-gray-100 rounded">{newApiKey}</div>
                    <Tooltip content="copy to clipboard">
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(newApiKey);
                          showToast(t("api_key_copied"), "success");
                        }}
                        type="button"
                        className="px-4 text-base ">
                        <ClipboardCopyIcon className="w-5 h-5 mr-2 text-neutral-100" />
                        {t("copy")}
                      </Button>
                    </Tooltip>
                  </div>
                  <div className="mt-2 mb-5 text-sm font-semibold text-gray-600">
                    {t("copy_safe_api_key")}
                  </div>
                </>
              )}

              <ul className="mt-5 mb-5 mr-5">
                <li>{t("log_into_zapier_account")}</li>
                <li>{t("select_cal_trigger_app")}</li>
                <li>{t("choose_account_enter_key")}</li>
                <li>{t("test_your_trigger")}</li>
                <li>{t("you_are_set")}</li>
              </ul>
              <Link href={"/apps/installed"} passHref={true}>
                <Button color="secondary">{t("done")}</Button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 ml-5">
          <div>{t("install_zapier_app")}</div>
          <div className="mt-3">
            <Link href={"/apps/zapier"} passHref={true}>
              <Button>{t("go_to_app_store")}</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
