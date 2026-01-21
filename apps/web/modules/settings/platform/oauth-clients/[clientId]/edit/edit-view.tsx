"use client";

import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";

import { ErrorCode } from "@calcom/lib/errorCodes";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { PERMISSIONS_GROUPED_MAP } from "@calcom/platform-constants";
import { showToast } from "@calcom/ui/components/toast";

import { useOAuthClient } from "@lib/hooks/settings/platform/oauth-clients/useOAuthClient";
import { useUpdateOAuthClient } from "@lib/hooks/settings/platform/oauth-clients/useUpdateOAuthClient";

import NoPlatformPlan from "@components/settings/platform/dashboard/NoPlatformPlan";
import { useGetUserAttributes } from "@components/settings/platform/hooks/useGetUserAttributes";
import type { FormValues } from "@components/settings/platform/oauth-clients/oauth-client-form";
import { OAuthClientForm as EditOAuthClientForm } from "@components/settings/platform/oauth-clients/oauth-client-form";

import Shell from "~/shell/Shell";

export default function EditOAuthClient() {
  const { t } = useLocale();
  const router = useRouter();
  const params = useParams<{ clientId: string }>();
  const clientId = params?.clientId || "";

  const { isUserLoading, isPlatformUser, isPaidUser } = useGetUserAttributes();

  const { data, isFetched, isFetching, isError, refetch } = useOAuthClient(clientId);
  const { mutateAsync: update, isPending: isUpdating } = useUpdateOAuthClient({
    onSuccess: () => {
      showToast(t("oauth_client_updated_successfully"), "success");
      refetch();
      router.push("/settings/platform/");
    },
    onError: () => {
      showToast(ErrorCode.UpdatingOauthClientError, "error");
    },
    clientId,
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

    update({
      name: data.name,
      // logo: data.logo,
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
        <Shell title={t("oAuth_client_updation_form")} isPlatformUser={true}>
          <div className="m-2 md:mx-14 md:mx-5">
            <div className="border-subtle mx-auto block justify-between rounded-t-lg border px-4 py-6 sm:flex sm:px-6">
              <div className="flex w-full flex-col">
                <h1 className="font-cal text-emphasis mb-1 text-xl font-semibold leading-5 tracking-wide">
                  {t("oAuth_client_updation_form")}
                </h1>
                <p className="text-default text-sm ltr:mr-4 rtl:ml-4">
                  {t("oAuth_client_updation_form_description")}
                </p>
              </div>
            </div>
            {(!clientId || (isFetched && !data)) && <p>{t("oauth_client_not_found")}</p>}
            {isFetched && !!data && (
              <EditOAuthClientForm
                defaultValues={{
                  name: data?.name ?? "",
                  areEmailsEnabled: data.areEmailsEnabled ?? false,
                  areDefaultEventTypesEnabled: data.areDefaultEventTypesEnabled ?? false,
                  areCalendarEventsEnabled: data.areCalendarEventsEnabled,
                  redirectUris: data?.redirectUris?.map((uri) => ({ uri })) ?? [{ uri: "" }],
                  bookingRedirectUri: data?.bookingRedirectUri ?? "",
                  bookingCancelRedirectUri: data?.bookingCancelRedirectUri ?? "",
                  bookingRescheduleRedirectUri: data?.bookingRescheduleRedirectUri ?? "",
                  appsRead: data?.permissions.includes("APPS_READ"),
                  appsWrite: data?.permissions.includes("APPS_WRITE"),
                  bookingRead: data?.permissions.includes("BOOKING_READ"),
                  bookingWrite: data?.permissions.includes("BOOKING_WRITE"),
                  eventTypeRead: data?.permissions.includes("EVENT_TYPE_READ"),
                  eventTypeWrite: data?.permissions.includes("EVENT_TYPE_WRITE"),
                  profileRead: data?.permissions.includes("PROFILE_READ"),
                  profileWrite: data?.permissions.includes("PROFILE_WRITE"),
                  scheduleRead: data?.permissions.includes("SCHEDULE_READ"),
                  scheduleWrite: data?.permissions.includes("SCHEDULE_WRITE"),
                }}
                onSubmit={onSubmit}
                isPending={isUpdating}
              />
            )}
            {isFetching && <p>{t("loading")}</p>}
            {isError && <p>{t("something_went_wrong")}</p>}
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
