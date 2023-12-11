import type { InferGetServerSidePropsType } from "next";
import { Trans } from "next-i18next";
import Link from "next/link";
import { useState } from "react";
import { Toaster } from "react-hot-toast";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, Tooltip, showToast } from "@calcom/ui";
import { Clipboard } from "@calcom/ui/components/icon";

import type { getServerSideProps } from "./_getServerSideProps";

const MAKE = "make";

export default function MakeSetup({ inviteLink }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [newApiKeys, setNewApiKeys] = useState<Record<string, string>>({});

  const { t } = useLocale();
  const utils = trpc.useContext();
  const integrations = trpc.viewer.integrations.useQuery({ variant: "automation" });
  const oldApiKey = trpc.viewer.apiKeys.findKeyOfType.useQuery({ appId: MAKE });
  const teamsList = trpc.viewer.teams.listOwnedTeams.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const teams = teamsList.data?.map((team) => ({ id: team.id, name: team.name }));
  const deleteApiKey = trpc.viewer.apiKeys.delete.useMutation({
    onSuccess: () => {
      utils.viewer.apiKeys.findKeyOfType.invalidate();
    },
  });
  const makeCredentials: { userCredentialIds: number[] } | undefined = integrations.data?.items.find(
    (item: { type: string }) => item.type === "make_automation"
  );
  const [credentialId] = makeCredentials?.userCredentialIds || [false];
  const showContent = integrations.data && integrations.isSuccess && credentialId;

  async function createApiKey(teamId?: number) {
    const event = { note: "Make", expiresAt: null, appId: MAKE, teamId };
    const apiKey = await utils.client.viewer.apiKeys.create.mutate(event);

    if (oldApiKey.data) {
      const oldKey = teamId
        ? oldApiKey.data.find((key) => key.teamId === teamId)
        : oldApiKey.data.find((key) => !key.teamId);

      if (oldKey) {
        deleteApiKey.mutate({
          id: oldKey.id,
        });
      }
    }

    return apiKey;
  }

  async function generateApiKey(teamId?: number) {
    const apiKey = await createApiKey(teamId);
    setNewApiKeys({ ...newApiKeys, [teamId || ""]: apiKey });
  }

  if (integrations.isLoading) {
    return <div className="bg-emphasis absolute z-50 flex h-screen w-full items-center" />;
  }

  return (
    <div className="bg-emphasis flex h-screen">
      {showContent ? (
        <div className="bg-default m-auto max-w-[43em] overflow-auto rounded pb-10 md:p-10">
          <div className="md:flex md:flex-row">
            <div className="invisible md:visible">
              <img className="h-11" src="/api/app-store/make/icon.svg" alt="Make Logo" />
            </div>
            <div className="ml-2 ltr:mr-2 rtl:ml-2 md:ml-5">
              <div className="text-default">{t("setting_up_make")}</div>

              <>
                <div className="mt-1 text-xl">{t("generate_api_key")}:</div>
                {!teams ? (
                  <Button color="secondary" onClick={() => createApiKey()} className="mb-4 mt-2">
                    {t("generate_api_key")}
                  </Button>
                ) : (
                  <>
                    <div className="mt-8 text-sm font-semibold">Your event types:</div>
                    {!newApiKeys[""] ? (
                      <Button color="secondary" onClick={() => generateApiKey()} className="mb-4 mt-2">
                        {t("generate_api_key")}
                      </Button>
                    ) : (
                      <CopyApiKey apiKey={newApiKeys[""]} />
                    )}
                    {teams.map((team) => {
                      return (
                        <div key={team.name}>
                          <div className="mt-2 text-sm font-semibold">{team.name}:</div>
                          {!newApiKeys[team.id] ? (
                            <Button
                              color="secondary"
                              onClick={() => generateApiKey(team.id)}
                              className="mb-4 mt-2">
                              {t("generate_api_key")}
                            </Button>
                          ) : (
                            <CopyApiKey apiKey={newApiKeys[team.id]} />
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </>

              <ol className="mb-5 ml-5 mt-5 list-decimal ltr:mr-5 rtl:ml-5">
                <Trans i18nKey="make_setup_instructions">
                  <li>
                    Go to
                    <a href={inviteLink} className="ml-1 mr-1 text-orange-600 underline">
                      Make Invite Link
                    </a>
                    and install the Cal.com app.
                  </li>
                  <li>Log into your Make account and create a new Scenario.</li>
                  <li>Select Cal.com as your Trigger app. Also choose a Trigger event.</li>
                  <li>Choose your account and then enter your Unique API Key.</li>
                  <li>Test your Trigger.</li>
                  <li>You&apos;re set!</li>
                </Trans>
              </ol>
              <Link href="/apps/installed/automation?hl=make" passHref={true} legacyBehavior>
                <Button color="secondary">{t("done")}</Button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="ml-5 mt-5">
          <div>{t("install_make_app")}</div>
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

const CopyApiKey = ({ apiKey }: { apiKey: string }) => {
  const { t } = useLocale();
  return (
    <div>
      <div className="my-2 mt-3 flex-wrap sm:flex sm:flex-nowrap">
        <code className="bg-subtle h-full w-full whitespace-pre-wrap rounded-md py-[6px] pl-2 pr-2 sm:rounded-r-none sm:pr-5">
          {apiKey}
        </code>
        <Tooltip side="top" content={t("copy_to_clipboard")}>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(apiKey);
              showToast(t("api_key_copied"), "success");
            }}
            type="button"
            className="mt-4 text-base sm:mt-0 sm:rounded-l-none">
            <Clipboard className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
            {t("copy")}
          </Button>
        </Tooltip>
      </div>
      <div className="text-subtle mb-5 mt-2 text-sm">{t("copy_somewhere_safe")}</div>
    </div>
  );
};
