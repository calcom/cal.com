import { useSession } from "next-auth/react";
import { Trans } from "next-i18next";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Avatar, Button, Select } from "@calcom/ui";
import { Plus, Info } from "@calcom/ui/components/icon";

import PageWrapper from "@components/PageWrapper";

export default function Authorize() {
  const { t } = useLocale();
  const { status } = useSession();

  const router = useRouter();
  const { state, client_id, scope } = router.query;

  const [selectedAccount, setSelectedAccount] = useState<{ value: string; label: string } | null>();
  const scopes = scope ? scope.toString().split(",") : [];

  const { data: client, isLoading: isLoadingGetClient } = trpc.viewer.oAuth.getClient.useQuery(
    {
      clientId: client_id,
    },
    {
      enabled: router.isReady && status !== "loading",
    }
  );

  const { data, isLoading: isLoadingProfiles } = trpc.viewer.teamsAndUserProfilesQuery.useQuery();

  const generateAuthCodeMutation = trpc.viewer.oAuth.generateAuthCode.useMutation({
    onSuccess: (data) => {
      window.location.href = `${client.redirectUri}?code=${data.authorizationCode}&state=${state}`;
    },
  });

  const mappedProfiles = data
    ? data
        .filter((profile) => !profile.readOnly)
        .map((profile) => ({
          label: profile.name || "",
          value: profile.slug || "",
        }))
    : [];

  useEffect(() => {
    if (mappedProfiles.length > 0) {
      setSelectedAccount(mappedProfiles[0]);
    }
  }, [isLoadingProfiles]);

  const isLoading = isLoadingGetClient || isLoadingProfiles || !router.isReady || status === "loading";

  if (isLoading) {
    return <></>;
  }

  if (status === "unauthenticated") {
    const urlSearchParams = new URLSearchParams({
      callbackUrl: window.location.href,
    });
    router.replace(`/auth/login?${urlSearchParams.toString()}`);
    return <></>;
  }

  if (!client) {
    return <div>{t("unauthorized")}</div>;
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="max-w-xl rounded-md bg-white px-9 pb-3 pt-6">
        <div className="flex items-center justify-center">
          <Avatar
            alt=""
            fallback={<Plus className="text-subtle h-6 w-6" />}
            className="items-center"
            imageSrc={client.logo}
            size="lg"
          />
          <div className="relative -ml-6 h-24 w-24">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-[70px] w-[70px] items-center justify-center  rounded-full bg-white">
                <img src="/cal-com-icon.svg" alt="Logo" className="h-16 w-16 rounded-full" />
              </div>
            </div>
          </div>
        </div>
        <h1 className="p-5 text-center text-2xl font-bold tracking-tight">
          {t("access_cal_account", { clientName: client.name })}
        </h1>
        <div>{t("select_account_team")}</div>
        <Select
          isSearchable={true}
          onChange={(value) => {
            setSelectedAccount(value);
          }}
          defaultValue={selectedAccount}
          options={mappedProfiles}
        />
        <div className="mb-4 mt-2 font-medium">{t("allow_client_to", { clientName: client.name })}</div>
        <ul className="space-y-4 text-sm">
          <Trans i18nKey="oauth_access_permission_list">
            <li className="relative pl-5">
              <span className="absolute left-0">&#10003;</span> Associate you with your personal info from
              Cal.com
            </li>
            <li className="relative pl-5">
              <span className="absolute left-0">&#10003;</span> See your personal info, including any personal
              info you&apos;ve made publicly available
            </li>
            <li className="relative pl-5">
              <span className="absolute left-0">&#10003;</span> See your primary email address
            </li>
            <li className="relative pl-5">
              <span className="absolute left-0">&#10003;</span> Connect to your installed apps
            </li>
            <li className="relative pl-5">
              <span className="absolute left-0">&#10003;</span> Read, edit, delete your event-types
            </li>
            <li className="relative pl-5">
              <span className="absolute left-0">&#10003;</span> Read, edit, delete your availability
            </li>
            <li className="relative pl-5">
              <span className="absolute left-0">&#10003;</span> Read, edit, delete your bookings
            </li>
          </Trans>
        </ul>
        <div className="bg-subtle mb-8 mt-8 flex rounded-md p-3">
          <div>
            <Info className="mr-1 mt-0.5 h-4 w-4" />
          </div>
          <div className="ml-1 ">
            <div className="text-sm font-medium">Allow {client.name} to do this?</div>
            <div className="text-sm">
              By clicking allow, you allow this app to use your information in accordance with their terms of
              service and privacy policy. You can view or remove access in the Cal.com App Store.
            </div>{" "}
            {/* How can access be viewed? Access can be removed by uninstalling app */}
          </div>
        </div>
        <div className="border-subtle border- -mx-9 mb-4 border-b" />
        <div className="flex justify-end">
          <Button
            className="mr-2"
            color="minimal"
            onClick={() => {
              window.location.href = `${client.redirectUri}`;
            }}>
            Go back
          </Button>
          <Button
            onClick={() => {
              generateAuthCodeMutation.mutate({ clientId: client_id, scopes });
            }}>
            Allow
          </Button>
        </div>
      </div>
    </div>
  );
}

Authorize.PageWrapper = PageWrapper;
