"use client";

/* eslint-disable react-hooks/exhaustive-deps */
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { APP_NAME } from "@calcom/lib/constants";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { Select } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { Tooltip } from "@calcom/ui/components/tooltip";

export function Authorize() {
  const { t } = useLocale();
  const { status } = useSession();
  const { data: user } = useMeQuery();

  const router = useRouter();
  const searchParams = useCompatSearchParams();

  const client_id = (searchParams?.get("client_id") as string) || "";
  const redirect_uri = searchParams?.get("redirect_uri") as string;
  const state = searchParams?.get("state") as string;
  const scope = searchParams?.get("scope") as string;
  const code_challenge = searchParams?.get("code_challenge") as string;
  const code_challenge_method = searchParams?.get(
    "code_challenge_method"
  ) as string;
  const show_account_selector =
    searchParams?.get("show_account_selector") === "true";

  const queryString = searchParams?.toString();

  const [selectedAccount, setSelectedAccount] = useState<{
    value: string;
    label: string;
  } | null>();
  const scopes = scope ? scope.toString().split(",") : [];

  const {
    data: client,
    error: getClientError,
    isPending: isPendingGetClient,
  } = trpc.viewer.oAuth.getClientForAuthorization.useQuery(
    {
      clientId: client_id as string,
      redirectUri: redirect_uri,
    },
    {
      enabled: status === "authenticated" && !!redirect_uri,
    }
  );

  const { data, isPending: isPendingProfiles } =
    trpc.viewer.loggedInViewerRouter.teamsAndUserProfilesQuery.useQuery(
      undefined,
      {
        enabled: show_account_selector,
      }
    );

  const generateAuthCodeMutation =
    trpc.viewer.oAuth.generateAuthCode.useMutation({
      onSuccess: (data) => {
        window.location.href =
          data.redirectUrl ??
          `${client?.redirectUri}?code=${data.authorizationCode}&state=${state}`;
      },
      onError: (error) => {
        if (client?.redirectUri) {
          redirectToOAuthError({
            redirectUri: client.redirectUri,
            trpcError: error,
            state,
          });
        }
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
    if (show_account_selector && mappedProfiles.length > 0) {
      setSelectedAccount(mappedProfiles[0]);
    }
  }, [isPendingProfiles, show_account_selector]);

  // Auto-authorize trusted clients
  useEffect(() => {
    if (client?.isTrusted) {
      generateAuthCodeMutation.mutate({
        clientId: client_id as string,
        redirectUri: client.redirectUri,
        scopes,
        codeChallenge: code_challenge || undefined,
        codeChallengeMethod: (code_challenge_method as "S256") || undefined,
        state,
      });
    }
  }, [client?.isTrusted]);

  useEffect(() => {
    if (status === "unauthenticated") {
      const urlSearchParams = new URLSearchParams({
        callbackUrl: `auth/oauth2/authorize?${queryString}`,
      });
      // Pass register param directly so login page can hide "Don't have an account" link
      const registerParam = searchParams?.get("register");
      if (registerParam) {
        urlSearchParams.set("register", registerParam);
      }
      router.replace(`/auth/login?${urlSearchParams.toString()}`);
    }
  }, [status]);

  if (getClientError) {
    return <div>{getClientError.message}</div>;
  }

  if (
    isPendingGetClient ||
    (show_account_selector && isPendingProfiles) ||
    status !== "authenticated"
  ) {
    return <></>;
  }

  if (!client) {
    return <div>{t("unauthorized")}</div>;
  }

  // Don't show UI for trusted clients, they'll auto-authorize
  if (client.isTrusted) {
    return (
      <div className="flex justify-center pt-32">
        <div className="flex items-center space-x-3">
          <span className="text-lg font-medium text-gray-700">
            {t("authorizing")}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#F7F7F7] px-4 pt-6 pb-6">
      <div className="w-full max-w-[464px]">
        <div className="rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] px-8 pt-6 pb-6">
          <div className="relative mb-6 flex items-center">
            <div className="relative z-10 h-[58px] w-[58px] overflow-hidden rounded-full bg-default shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)]">
              {client.logo ? (
                <img
                  src={client.logo}
                  alt={client.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Icon name="plus" className="h-6 w-6 text-subtle" />
                </div>
              )}
            </div>
            <div className="relative z-20 -ml-3 h-[58px] w-[58px] overflow-hidden rounded-full bg-[#070A0D] shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)]">
              <div className="flex h-full w-full items-center justify-center">
                <img
                  src="/cal-com-icon.svg"
                  alt="Cal.com"
                  className="h-9 w-9"
                />
              </div>
            </div>
          </div>

          <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-[#6B7280]">
            <ServerTrans
              t={t}
              i18nKey="access_cal_account"
              values={{ clientName: client.name, appName: APP_NAME }}
              components={[
                <span key="client" className="font-bold text-black" />,
                <span key="app" className="font-bold text-black" />,
              ]}
            />
          </h1>
          {show_account_selector && (
            <div className="mt-6">
              <div className="mb-1 text-sm font-medium">
                {t("select_account_team")}
              </div>
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
            </div>
          )}

          <div className="-mx-8 mt-6 border-t rounded-xl border-b border-[#E8E8E8] bg-white px-8 py-6">
            <div className="mb-4 text-[15px] font-semibold text-[#070A0D]">
              {t("allow_client_to", { clientName: client.name })}
            </div>
            <ul className="space-y-3 text-[14px] text-[#181a1c]">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-[#D1D5DB]">&#8226;</span>
                {t("associate_with_cal_account", { clientName: client.name })}
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-[#D1D5DB]">&#8226;</span>
                {t("see_personal_info")}
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-[#D1D5DB]">&#8226;</span>
                {t("see_primary_email_address")}
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-[#D1D5DB]">&#8226;</span>
                {t("connect_installed_apps")}
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-[#D1D5DB]">&#8226;</span>
                {t("access_event_type")}
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-[#D1D5DB]">&#8226;</span>
                {t("access_availability")}
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-[#D1D5DB]">&#8226;</span>
                {t("access_bookings")}
              </li>
            </ul>

            <p className="mt-6 text-[14px] font-semibold text-[#070A0D]">
              {t("oauth_access_information", { appName: APP_NAME })}
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <Button
                type="button"
                color="primary"
                className="bg-[#070A0D]! border-[#070A0D]! shadow-none! text-white! w-full justify-center rounded-lg hover:bg-[#1a1d21]!"
                onClick={() => {
                  generateAuthCodeMutation.mutate({
                    clientId: client_id as string,
                    scopes,
                    redirectUri: client.redirectUri,
                    teamSlug: selectedAccount?.value.startsWith("team/")
                      ? selectedAccount?.value.substring(5)
                      : undefined,
                    codeChallenge: code_challenge || undefined,
                    codeChallengeMethod:
                      (code_challenge_method as "S256") || undefined,
                    state,
                  });
                }}
                data-testid="allow-button"
              >
                {t("allow")}
              </Button>
              <Button
                type="button"
                color="minimal"
                className="w-full justify-center rounded-lg"
                data-testid="deny-button"
                onClick={() => {
                  const redirectUrl = buildOAuthErrorRedirectUrl({
                    redirectUri: client.redirectUri,
                    error: "access_denied",
                    state,
                  });
                  window.location.href = redirectUrl;
                }}
              >
                {t("go_back")}
              </Button>
            </div>
          </div>

          {!show_account_selector && (
            <div className="mt-4 flex items-center justify-center gap-2 text-[14px] text-[#9CA3AF]">
              <span>{t("signed_in_as_label")}</span>
              <Avatar
                size="xs"
                alt={
                  user?.username
                    ? t("avatar_of_username", { username: user.username })
                    : t("avatar")
                }
                imageSrc={user?.avatarUrl ?? user?.avatar}
              />
              <Tooltip content={user?.email} side="bottom">
                <span
                  className="cursor-default font-medium text-[#9CA3AF]"
                  data-testid="signed-in-user"
                >
                  {user?.name || user?.email}
                </span>
              </Tooltip>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function mapTrpcCodeToOAuthError(code: string | undefined) {
  if (code === "BAD_REQUEST") return "invalid_request";
  if (code === "UNAUTHORIZED") return "unauthorized_client";
  return "server_error";
}

function buildOAuthErrorRedirectUrl({
  redirectUri,
  error,
  errorDescription,
  state,
}: {
  redirectUri: string;
  error: string;
  errorDescription?: string;
  state?: string;
}) {
  const errorParams = new URLSearchParams({
    error,
  });

  if (errorDescription) {
    errorParams.append("error_description", errorDescription);
  }

  if (state) {
    errorParams.append("state", state);
  }

  return `${redirectUri}${
    redirectUri.includes("?") ? "&" : "?"
  }${errorParams.toString()}`;
}

function redirectToOAuthError({
  redirectUri,
  trpcError,
  state,
}: {
  redirectUri: string;
  trpcError: { data?: { code?: string } | null; message: string };
  state?: string;
}) {
  const redirectUrl = buildOAuthErrorRedirectUrl({
    redirectUri,
    error: mapTrpcCodeToOAuthError(trpcError.data?.code),
    errorDescription: trpcError.message,
    state,
  });

  window.location.href = redirectUrl;
}

export default Authorize;
