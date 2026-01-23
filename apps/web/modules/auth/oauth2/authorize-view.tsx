"use client";

/* eslint-disable react-hooks/exhaustive-deps */
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { APP_NAME } from "@calcom/lib/constants";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { Select } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

export function Authorize() {
  const { t } = useLocale();
  const { status } = useSession();

  const router = useRouter();
  const searchParams = useCompatSearchParams();

  const client_id = (searchParams?.get("client_id") as string) || "";
  const redirect_uri = searchParams?.get("redirect_uri") as string;
  const state = searchParams?.get("state") as string;
  const scope = searchParams?.get("scope") as string;
  const code_challenge = searchParams?.get("code_challenge") as string;
  const code_challenge_method = searchParams?.get("code_challenge_method") as string;

  const queryString = searchParams?.toString();

  const [selectedAccount, setSelectedAccount] = useState<{ value: string; label: string } | null>();
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
    trpc.viewer.loggedInViewerRouter.teamsAndUserProfilesQuery.useQuery();

  const generateAuthCodeMutation = trpc.viewer.oAuth.generateAuthCode.useMutation({
    onSuccess: (data) => {
      window.location.href =
        data.redirectUrl ?? `${client?.redirectUri}?code=${data.authorizationCode}&state=${state}`;
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
    if (mappedProfiles.length > 0) {
      setSelectedAccount(mappedProfiles[0]);
    }
  }, [isPendingProfiles]);

  // Auto-authorize trusted clients
  useEffect(() => {
    if (client?.isTrusted && selectedAccount) {
      generateAuthCodeMutation.mutate({
        clientId: client_id as string,
        redirectUri: client.redirectUri,
        scopes,
        codeChallenge: code_challenge || undefined,
        codeChallengeMethod: (code_challenge_method as "S256") || undefined,
        state,
      });
    }
  }, [client?.isTrusted, selectedAccount]);

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

  if (isPendingGetClient || isPendingProfiles || status !== "authenticated") {
    return <></>;
  }

  if (!client) {
    return <div>{t("unauthorized")}</div>;
  }

  // Don't show UI for trusted clients, they'll auto-authorize
  if (client.isTrusted && selectedAccount) {
    return (
      <div className="flex justify-center pt-32">
        <div className="flex items-center space-x-3">
          <span className="text-lg font-medium text-gray-700">Authorizing...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="bg-default border-subtle mt-2 max-w-xl rounded-md border px-9 pt-2 pb-3">
        <div className="flex items-center justify-center">
          <Avatar
            alt=""
            fallback={<Icon name="plus" className="text-subtle h-6 w-6" />}
            className="items-center"
            imageSrc={client.logo}
            size="lg"
          />
          <div className="relative -ml-6 h-24 w-24">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-default flex h-[70px] w-[70px] items-center  justify-center rounded-full">
                <img src="/cal-com-icon.svg" alt="Logo" className="h-16 w-16 rounded-full" />
              </div>
            </div>
          </div>
        </div>
        <h1 className="px-5 pt-3 pb-5 text-center text-2xl font-bold tracking-tight">
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
        <div className="mt-5 mb-4 font-medium">{t("allow_client_to", { clientName: client.name })}</div>
        <ul className="stack-y-4 text-sm">
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
        <div className="bg-subtle mt-8 mb-8 flex rounded-md p-3">
          <div>
            <Icon name="info" className="mr-1 mt-0.5 h-4 w-4" />
          </div>
          <div className="ml-1">
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
              const separator = client.redirectUri.includes("?") ? "&" : "?";
              const params = new URLSearchParams();
              params.set("error", "access_denied");
              if (state) {
                params.set("state", state);
              }
              window.location.href = `${client.redirectUri}${separator}${params.toString()}`;
            }}>
            {t("go_back")}
          </Button>
          <Button
            onClick={() => {
              generateAuthCodeMutation.mutate({
                clientId: client_id as string,
                scopes,
                redirectUri: client.redirectUri,
                teamSlug: selectedAccount?.value.startsWith("team/")
                  ? selectedAccount?.value.substring(5)
                  : undefined, // team account starts with /team/<slug>
                codeChallenge: code_challenge || undefined,
                codeChallengeMethod: (code_challenge_method as "S256") || undefined,
                state,
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

  return `${redirectUri}${redirectUri.includes("?") ? "&" : "?"}${errorParams.toString()}`;
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