"use client";

import { useParams, useRouter } from "next/navigation";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { ArrowLeftIcon, UserIcon } from "@coss/ui/icons";

const OAuthClientUsersView = () => {
  const { t } = useLocale();
  const router = useRouter();
  const params = useParams<{ clientId: string }>();
  const clientId = params?.clientId ?? "";

  const { data, isLoading } = trpc.viewer.oAuth.getClientAuthorizedUsers.useQuery(
    { clientId },
    { enabled: !!clientId }
  );

  return (
    <SettingsHeader
    title={data ? `${data.total} ${t("Authorized users")}` : t("oauth_authorized_users")}
    description={t("Users who have authorized this oauth client")}
    borderInShellHeader={true}
    CTA={
        <Button
          color="secondary"
          StartIcon="arrow-left"
          onClick={() => router.push("/settings/developer/oauth")}>
          {t("back")}
        </Button>
    }>
      <div>
        {isLoading && (
          <div className="border-subtle divide-subtle divide-y rounded-b-lg border border-t-0">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4">
                <div className="bg-subtle h-10 w-10 animate-pulse rounded-full" />
                <div className="ml-4 flex-1 space-y-2">
                  <div className="bg-subtle h-4 w-32 animate-pulse rounded" />
                  <div className="bg-subtle h-3 w-48 animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && data && data.total > 0 && (
        <div className="border-subtle divide-subtle divide-y rounded-b-lg border border-t-0">
            {data.users.map((user) => (
            <div key={user.email} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                <Avatar
                    alt={user.name ?? user.email}
                    fallback={<UserIcon className="text-subtle h-5 w-5" />}
                    size="md"
                />
                <div>
                    <div className="text-emphasis font-medium">{user.name}</div>
                    <div className="text-subtle text-sm">{user.email}</div>
                </div>
                </div>
                <div className="text-subtle text-right text-sm">
                <div>{t("authorized")}: {new Date(user.authorizedAt).toLocaleDateString()}</div>
                <div>
                    {t("refreshed")}:{" "}
                    {user.lastRefreshedAt
                    ? new Date(user.lastRefreshedAt).toLocaleDateString()
                    : "-"}
                </div>
                </div>
            </div>
            ))}
        </div>
        )}

        {!isLoading && (!data || data.total === 0) && (
          <EmptyScreen
            Icon="user"
            headline={t("No authorized users")}
            description={t("No authorized users description")}
            className="rounded-b-lg rounded-t-none border-t-0"
          />
        )}
      </div>
    </SettingsHeader>
  );
};

export default OAuthClientUsersView;