"use client";

import { useState } from "react";

import { useParams, useRouter } from "next/navigation";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { AccessScope } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { Pagination } from "@calcom/ui/components/pagination";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";

const PAGE_SIZE_OPTIONS = [50, 100, 250] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

const OAuthClientUsersView = () => {
  const { t } = useLocale();
  const router = useRouter();
  const params = useParams<{ clientId: string }>();
  const clientId = params?.clientId || "";
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(50);

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize as PageSize);
    setPage(1);
  };

  const { data: countData } = trpc.viewer.oAuth.countAuthorizedUsers.useQuery(
    { clientId },
    { enabled: !!clientId, staleTime: Infinity }
  );
  const { data: usersData, isLoading } = trpc.viewer.oAuth.listAuthorizedUsers.useQuery(
    { clientId, page, pageSize },
    { enabled: !!clientId }
  );

  const backButton = (
    <Button
      data-testid="oauth-users-back"
      color="minimal"
      StartIcon="arrow-left"
      onClick={() => router.back()}>
      {t("back")}
    </Button>
  );

  if (isLoading) {
    return (
      <SettingsHeader
        title={t("oauth_authorized_users")}
        description={t("oauth_authorized_users_description")}
        CTA={backButton}>
        <SkeletonContainer>
          <div className="border-subtle rounded-lg border p-6">
            <SkeletonText className="h-8 w-full" />
          </div>
        </SkeletonContainer>
      </SettingsHeader>
    );
  }

  const pageAuthorizations = usersData ?? [];
  const totalAuthorizations = countData ?? 0;

  return (
    <SettingsHeader
      title={t("oauth_authorized_users_count", { count: totalAuthorizations })}
      description={t("oauth_authorized_users_description")}
      CTA={backButton}>
      <div data-testid="oauth-users-content">
        {pageAuthorizations.length > 0 ? (
          <>
            <div className="border-subtle rounded-lg border" data-testid="oauth-users-list">
              {pageAuthorizations.map((authorization, index) => (
                <Authorization
                  key={authorization.user.id}
                  authorization={authorization}
                  isLast={index === pageAuthorizations.length - 1}
                />
              ))}
            </div>
            {totalAuthorizations > pageSize && (
              <div className="mt-4">
                <Pagination
                  currentPage={page}
                  pageSize={pageSize}
                  totalItems={totalAuthorizations}
                  onPageChange={setPage}
                  onPageSizeChange={handlePageSizeChange}
                  pageSizeOptions={[...PAGE_SIZE_OPTIONS]}
                />
              </div>
            )}
          </>
        ) : (
          <EmptyScreen
            Icon="users"
            headline={t("no_authorized_users")}
            description={t("no_authorized_users_description")}
            className="rounded-lg"
          />
        )}
      </div>
    </SettingsHeader>
  );
};

type Authorization = {
  scopes: AccessScope[];
  createdAt: Date;
  lastRefreshedAt: Date | null;
  user: {
    id: number;
    name: string | null;
    email: string;
  };
};

function Authorization({
  authorization,
  isLast,
}: {
  authorization: Authorization;
  isLast: boolean;
}) {
  const { t } = useLocale();

  return (
    <div
      data-testid={`oauth-user-row-${authorization.user.id}`}
      className={`flex items-center justify-between p-4 ${!isLast ? "border-subtle border-b" : ""}`}>
      <div className="flex items-center gap-4">
        <Avatar alt={authorization.user.name || ""} size="sm" />
        <div>
          <div data-testid="oauth-user-name" className="text-emphasis font-medium">
            {authorization.user.name}
          </div>
          <div data-testid="oauth-user-email" className="text-subtle text-sm">
            {authorization.user.email}
          </div>
        </div>
      </div>
      <table className="text-subtle text-sm">
        <tbody>
          <tr>
            <td data-testid="oauth-user-authorized-label" className="whitespace-nowrap pr-1.5">
              {t("oauth_authorized_at")}:
            </td>
            <td data-testid="oauth-user-authorized-date">
              {new Date(authorization.createdAt).toLocaleDateString()}
            </td>
          </tr>
          <tr>
            <td data-testid="oauth-user-refreshed-label" className="whitespace-nowrap pr-1.5">
              {t("oauth_tokens_last_refreshed_at")}:
            </td>
            <td data-testid="oauth-user-refreshed-date">
              {authorization.lastRefreshedAt
                ? new Date(authorization.lastRefreshedAt).toLocaleDateString()
                : "-"}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default OAuthClientUsersView;
