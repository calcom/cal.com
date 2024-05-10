import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";

import Shell from "@calcom/features/shell/Shell";
import { PERMISSIONS_GROUPED_MAP } from "@calcom/platform-constants";
import { showToast } from "@calcom/ui";

import { useOAuthClient } from "@lib/hooks/settings/platform/oauth-clients/useOAuthClients";
import { useUpdateOAuthClient } from "@lib/hooks/settings/platform/oauth-clients/usePersistOAuthClient";

import PageWrapper from "@components/PageWrapper";
import { useGetUserAttributes } from "@components/settings/platform/hooks/useGetUserAttributes";
import type { FormValues } from "@components/settings/platform/oauth-clients/oauth-client-form";
import { OAuthClientForm as EditOAuthClientForm } from "@components/settings/platform/oauth-clients/oauth-client-form";

import {
  hasAppsReadPermission,
  hasAppsWritePermission,
  hasBookingReadPermission,
  hasBookingWritePermission,
  hasEventTypeReadPermission,
  hasEventTypeWritePermission,
  hasProfileReadPermission,
  hasProfileWritePermission,
  hasScheduleReadPermission,
  hasScheduleWritePermission,
} from "../../../../../../../../packages/platform/utils/permissions";

export default function EditOAuthClient() {
  const router = useRouter();
  const params = useParams<{ clientId: string }>();
  const clientId = params?.clientId || "";

  const { isUserLoading, isPlatformUser, isPaidUser } = useGetUserAttributes();

  const { data, isFetched, isFetching, isError, refetch } = useOAuthClient(clientId);
  const { mutateAsync: update, isPending: isUpdating } = useUpdateOAuthClient({
    onSuccess: () => {
      showToast("OAuth client updated successfully", "success");
      refetch();
      router.push("/settings/platform/");
    },
    onError: () => {
      showToast("Internal server error, please try again later", "error");
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
    });
  };

  if (isUserLoading) return <div className="m-5">Loading...</div>;

  if (isPlatformUser && isPaidUser) {
    return (
      <div>
        <Shell title="OAuth client updation form" isPlatformUser={true}>
          <div className="m-2 md:mx-14 md:mx-5">
            <div className="border-subtle mx-auto block justify-between rounded-t-lg border px-4 py-6 sm:flex sm:px-6">
              <div className="flex w-full flex-col">
                <h1 className="font-cal text-emphasis mb-1 text-xl font-semibold leading-5 tracking-wide">
                  OAuth client updation form
                </h1>
                <p className="text-default text-sm ltr:mr-4 rtl:ml-4">
                  This is the form to edit an existing OAuth client
                </p>
              </div>
            </div>
            {(!Boolean(clientId) || (isFetched && !data)) && <p>OAuth Client not found.</p>}
            {isFetched && !!data && (
              <EditOAuthClientForm
                defaultValues={{
                  name: data?.name ?? "",
                  areEmailsEnabled: data.areEmailsEnabled ?? false,
                  redirectUris: data?.redirectUris?.map((uri) => ({ uri })) ?? [{ uri: "" }],
                  bookingRedirectUri: data?.bookingRedirectUri ?? "",
                  bookingCancelRedirectUri: data?.bookingCancelRedirectUri ?? "",
                  bookingRescheduleRedirectUri: data?.bookingRescheduleRedirectUri ?? "",
                  appsRead: hasAppsReadPermission(data?.permissions),
                  appsWrite: hasAppsWritePermission(data?.permissions),
                  bookingRead: hasBookingReadPermission(data?.permissions),
                  bookingWrite: hasBookingWritePermission(data?.permissions),
                  eventTypeRead: hasEventTypeReadPermission(data?.permissions),
                  eventTypeWrite: hasEventTypeWritePermission(data?.permissions),
                  profileRead: hasProfileReadPermission(data?.permissions),
                  profileWrite: hasProfileWritePermission(data?.permissions),
                  scheduleRead: hasScheduleReadPermission(data?.permissions),
                  scheduleWrite: hasScheduleWritePermission(data?.permissions),
                }}
                onSubmit={onSubmit}
                isPending={isUpdating}
              />
            )}
            {isFetching && <p>Loading...</p>}
            {isError && <p>Something went wrong.</p>}
          </div>
        </Shell>
      </div>
    );
  }

  return (
    <div>
      <Shell isPlatformUser={true} hideHeadingOnMobile withoutMain={false} SidebarContainer={<></>}>
        You are not subscribed to a Platform plan.
      </Shell>
    </div>
  );
}

EditOAuthClient.PageWrapper = PageWrapper;
