"use client";

import { useRouter } from "next/navigation";

import { ErrorCode } from "@calcom/lib/errorCodes";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { PERMISSION_MAP } from "@calcom/platform-constants";
import { PERMISSIONS_GROUPED_MAP } from "@calcom/platform-constants/permissions";
import { showToast } from "@calcom/ui/components/toast";

import { useCreateOAuthClient } from "@lib/hooks/settings/platform/oauth-clients/useCreateOAuthClient";

import NoPlatformPlan from "@components/settings/platform/dashboard/NoPlatformPlan";
import { useGetUserAttributes } from "@components/settings/platform/hooks/useGetUserAttributes";
import type { FormValues } from "@components/settings/platform/oauth-clients/oauth-client-form";
import { OAuthClientForm } from "@components/settings/platform/oauth-clients/oauth-client-form";

import Shell from "~/shell/Shell";

export default function CreateOAuthClient() {
  const router = useRouter();
  const { t } = useLocale();

  const { isUserLoading, isPlatformUser, isPaidUser } = useGetUserAttributes();

  const { mutateAsync: save, isPending: isSaving } = useCreateOAuthClient({
    onSuccess: () => {
      showToast("OAuth client created successfully", "success");
      router.push("/settings/platform/");
    },
    onError: () => {
      showToast(ErrorCode.CreatingOauthClientError, "error");
    },
  });

  const onSubmit = (data: FormValues) => {
    const userPermissions: Array<keyof typeof PERMISSION_MAP> = [];
    const userRedirectUris = data.redirectUris.map((uri) => uri.uri).filter((uri) => !!uri);

    Object.keys(PERMISSIONS_GROUPED_MAP).forEach((key) => {
      const entity = key as keyof typeof PERMISSIONS_GROUPED_MAP;
      const entityKey = PERMISSIONS_GROUPED_MAP[entity].key;

      if (data[`${entityKey}Read`]) userPermissions.push(`${entity}_READ`);
      if (data[`${entityKey}Write`]) userPermissions.push(`${entity}_WRITE`);
    });

    save({
      name: data.name,
      permissions: userPermissions,
      redirectUris: userRedirectUris,
      bookingRedirectUri: data.bookingRedirectUri,
      bookingCancelRedirectUri: data.bookingCancelRedirectUri,
      bookingRescheduleRedirectUri: data.bookingRescheduleRedirectUri,
      areEmailsEnabled: data.areEmailsEnabled,
      areDefaultEventTypesEnabled: data.areDefaultEventTypesEnabled,
      areCalendarEventsEnabled: data.areCalendarEventsEnabled,
    });
  };

  if (isUserLoading) return <div className="m-5">{t("loading")}</div>;

  if (isPlatformUser && isPaidUser) {
    return (
      <div>
        <Shell title={t("oAuth_client_creation_form")} isPlatformUser={true}>
          <div className="m-2 md:mx-5">
            <div className="border-subtle mx-auto block justify-between rounded-t-lg border px-4 py-6 sm:flex sm:px-6">
              <div className="flex w-full flex-col">
                <h1 className="font-cal text-emphasis mb-1 text-xl font-semibold leading-5 tracking-wide">
                  {t("oAuth_client_creation_form")}
                </h1>
                <p className="text-default text-sm ltr:mr-4 rtl:ml-4">
                  {t("oAuth_client_creation_form_description")}
                </p>
              </div>
            </div>
            <OAuthClientForm isPending={isSaving} onSubmit={onSubmit} />
          </div>
        </Shell>
      </div>
    );
  }

  return (
    <div>
      <Shell isPlatformUser={true} withoutMain={false} SidebarContainer={<></>}>
        <NoPlatformPlan />
      </Shell>
    </div>
  );
}
