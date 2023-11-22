import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { APP_NAME } from "@calcom/lib/constants";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Avatar, Button, Select } from "@calcom/ui";
import { Plus, Info } from "@calcom/ui/components/icon";

import PageWrapper from "@components/PageWrapper";

export default function Authorize() {
  const { t } = useLocale();
  const { status } = useSession();

  const router = useRouter();
  const searchParams = useCompatSearchParams();

  const client_id = searchParams?.get("client_id") as string;
  const state = searchParams?.get("state") as string;
  const scope = searchParams?.get("scope") as string;

  const queryString = searchParams?.toString();

  const [selectedAccount, setSelectedAccount] = useState<{ value: string; label: string } | null>();
  const scopes = scope ? scope.toString().split(",") : [];

  const { data: client, isLoading: isLoadingGetClient } = trpc.viewer.oAuth.getClient.useQuery(
    {
      clientId: client_id as string,
    },
    {
      enabled: status !== "loading",
    }
  );

  const { data, isLoading: isLoadingProfiles } = trpc.viewer.teamsAndUserProfilesQuery.useQuery();

  const generateAuthCodeMutation = trpc.viewer.oAuth.generateAuthCode.useMutation({
    onSuccess: (data) => {
      window.location.href = `${client?.redirectUri}?code=${data.authorizationCode}&state=${state}`;
    },
  });

  const mappedProfiles = data
    ? data
        .filter((profile) => !profile.readOnly)
        .map((profile) => ({
          label: profile.name || profile.slug || "",
          value: profile.slug || "",
        }))
    : [];

  useEffect(() => {
    if (mappedProfiles.length > 0) {
      setSelectedAccount(mappedProfiles[0]);
    }
  }, [isLoadingProfiles]);

  useEffect(() => {
    if (status === "unauthenticated") {
      const urlSearchParams = new URLSearchParams({
        callbackUrl: `auth/oauth2/authorize?${queryString}`,
      });
      router.replace(`/auth/login?${urlSearchParams.toString()}`);
    }
  }, [status]);

  const isLoading = isLoadingGetClient || isLoadingProfiles || status !== "authenticated";

  if (isLoading) {
    return <></>;
  }

  if (!client) {
    return <div>{t("unauthorized")}</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="mt-2 max-w-xl rounded-md bg-white px-9 pb-3 pt-2">
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
        <h1 className="px-5 pb-5 pt-3 text-center text-2xl font-bold tracking-tight">
          {t("access_cal_account", { clientName: client.name, appName: APP_NAME })}
        </h1>
        <div className="mb-1 text-sm font-medium">{t("select_account_team")}</div>
        <Select
          isSearchable={true}
          id="account-select"
          onChange={(value) => {
            setSelectedAccount(value);
          }}
          className="w-52"
          defaultValue={selectedAccount || mappedProfiles[0]}
          options={mappedProfiles}
        />
        <div className="mb-4 mt-5 font-medium">{t("allow_client_to", { clientName: client.name })}</div>
        <ul className="space-y-4 text-sm">
          <li className="relative pl-5">
            <span className="absolute left-0">&#10003;</span>{" "}
            {t("associate_with_cal_account", { clientName: client.name })}
          </li>
          <li className="relative pl-5">
            <span className="absolute left-0">&#10003;</span> {t("see_personal_info")}
          </li>
          <li className="relative pl-5">
            <span className="absolute left-0">&#10003;</span> {t("see_primary_email_address")}
          </li>
          <li className="relative pl-5">
            <span className="absolute left-0">&#10003;</span> {t("connect_installed_apps")}
          </li>
          <li className="relative pl-5">
            <span className="absolute left-0">&#10003;</span> {t("access_event_type")}
          </li>
          <li className="relative pl-5">
            <span className="absolute left-0">&#10003;</span> {t("access_availability")}
          </li>
          <li className="relative pl-5">
            <span className="absolute left-0">&#10003;</span> {t("access_bookings")}
          </li>
        </ul>
        <div className="bg-subtle mb-8 mt-8 flex rounded-md p-3">
          <div>
            <Info className="mr-1 mt-0.5 h-4 w-4" />
          </div>
          <div className="ml-1 ">
            <div className="mb-1 text-sm font-medium">
              {t("allow_client_to_do", { clientName: client.name })}
            </div>
            <div className="text-sm">{t("oauth_access_information", { appName: APP_NAME })}</div>{" "}
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
            {t("go_back")}
          </Button>
          <Button
            onClick={() => {
              generateAuthCodeMutation.mutate({
                clientId: client_id as string,
                scopes,
                teamSlug: selectedAccount?.value.startsWith("team/")
                  ? selectedAccount?.value.substring(5)
                  : undefined, // team account starts with /team/<slug>
              });
            }}
            data-testid="allow-button">
            {t("allow")}
          </Button>
        </div>
      </div>
    </div>
  );
}

Authorize.PageWrapper = PageWrapper;
