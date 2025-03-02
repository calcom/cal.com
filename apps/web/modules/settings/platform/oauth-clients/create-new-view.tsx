"use client";

import { useRouter } from "next/navigation";

import Shell from "@calcom/features/shell/Shell";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { PERMISSIONS_GROUPED_MAP } from "@calcom/platform-constants/permissions";
import { showToast } from "@calcom/ui";

import { useCreateOAuthClient } from "@lib/hooks/settings/platform/oauth-clients/usePersistOAuthClient";

import NoPlatformPlan from "@components/settings/platform/dashboard/NoPlatformPlan";
import { useGetUserAttributes } from "@components/settings/platform/hooks/useGetUserAttributes";
import type { FormValues } from "@components/settings/platform/oauth-clients/oauth-client-form";
import { OAuthClientForm } from "@components/settings/platform/oauth-clients/oauth-client-form";

export default function CreateOAuthClient() {
  const searchParams = useCompatSearchParams();
  const router = useRouter();
  const { t } = useLocale();
  const clientId = searchParams?.get("clientId") || "";

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
    let userPermissions = 0;
    const userRedirectUris = data.redirectUris.map((uri) => uri.uri).filter((uri) => !!uri);

    Object.keys(PERMISSIONS_GROUPED_MAP).forEach((key) => {
      const entity = key as keyof typeof PERMISSIONS_GROUPED_MAP;
      const entityKey = PERMISSIONS_GROUPED_MAP[entity].key;
      const read = PERMISSIONS_GROUPED_MAP[entity].read;
      const write = PERMISSIONS_GROUPED_MAP[entity].write;
      if (data[`${entityKey}Read`]) userPermissions |= read;
      if (data[`${entityKey}Write`]) userPermissions |= write;
    });

    save({
      name: data.name,
      permissions: userPermissions,
      // logo: data.logo,
      redirectUris: userRedirectUris,
      bookingRedirectUri: data.bookingRedirectUri,
      bookingCancelRedirectUri: data.bookingCancelRedirectUri,
      bookingRescheduleRedirectUri: data.bookingRescheduleRedirectUri,
      areEmailsEnabled: data.areEmailsEnabled,
    });
  };

  if (isUserLoading) return <div className="m-5">Loading...</div>;

  if (isPlatformUser && isPaidUser) {
    return (
      <div>
        <Shell title={t("oAuth_client_creation_form")} isPlatformUser={true} withoutSeo={true}>
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
      <Shell withoutSeo={true} isPlatformUser={true} withoutMain={false} SidebarContainer={<></>}>
        <NoPlatformPlan />
      </Shell>
    </div>
  );
}
