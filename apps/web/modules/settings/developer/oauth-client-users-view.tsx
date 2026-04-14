"use client";

import { useLocale } from "@calcom/i18n/useLocale";
import type { AccessScope } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Pagination } from "@calcom/ui/components/pagination";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { Button } from "@coss/ui/components/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@coss/ui/components/empty";
import { ArrowLeftIcon, UsersIcon } from "@coss/ui/icons";
import { AppHeader, AppHeaderContent, AppHeaderDescription } from "@coss/ui/shared/app-header";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useState } from "react";

const PAGE_SIZE_OPTIONS = [50, 100, 250] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

const OAuthClientUsersView = () => {
  const { t } = useLocale();
  const pathname = usePathname();
  const params = useParams<{ clientId: string }>();
  const clientId = params?.clientId || "";
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(50);

  let basePath = "/settings/developer/oauth";
  if (pathname?.startsWith("/settings/admin")) {
    basePath = "/settings/admin/oauth";
  }

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

  const headerBlock = (title: string) => (
    <AppHeader>
      <div className="flex min-w-0 items-start gap-3">
        <Button
          data-testid="oauth-users-back"
          aria-label={t("go_back")}
          render={<Link className="flex text-muted-foreground hover:text-foreground" href={basePath} />}
          size="icon-sm"
          variant="ghost">
          <ArrowLeftIcon />
        </Button>
        <AppHeaderContent title={title}>
          <AppHeaderDescription>{t("oauth_authorized_users_description")}</AppHeaderDescription>
        </AppHeaderContent>
      </div>
    </AppHeader>
  );

  if (isLoading) {
    return (
      <>
        {headerBlock(t("oauth_authorized_users"))}
        <div className="flex flex-col gap-6" data-testid="oauth-users-content">
          <SkeletonContainer>
            <div className="rounded-lg border border-subtle p-6">
              <SkeletonText className="h-8 w-full" />
            </div>
          </SkeletonContainer>
        </div>
      </>
    );
  }

  const pageAuthorizations = usersData ?? [];
  const totalAuthorizations = countData ?? 0;

  return (
    <>
      {headerBlock(t("oauth_authorized_users_count", { count: totalAuthorizations }))}
      <div className="flex flex-col gap-6" data-testid="oauth-users-content">
        {pageAuthorizations.length > 0 ? (
          <>
            <div className="rounded-lg border" data-testid="oauth-users-list">
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
          <Empty className="rounded-xl border border-dashed" data-testid="empty-screen">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UsersIcon />
              </EmptyMedia>
              <EmptyTitle>{t("no_authorized_users")}</EmptyTitle>
              <EmptyDescription>{t("no_authorized_users_description")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </>
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

function Authorization({ authorization, isLast }: { authorization: Authorization; isLast: boolean }) {
  const { t } = useLocale();

  return (
    <div
      data-testid={`oauth-user-row-${authorization.user.id}`}
      className={`flex items-center justify-between p-4 ${!isLast ? "border-subtle border-b" : ""}`}>
      <div className="flex items-center gap-4">
        <Avatar alt={authorization.user.name || ""} size="sm" />
        <div>
          <div data-testid="oauth-user-name" className="font-medium text-emphasis">
            {authorization.user.name}
          </div>
          <div data-testid="oauth-user-email" className="text-sm text-subtle">
            {authorization.user.email}
          </div>
        </div>
      </div>
      <table className="text-sm text-subtle">
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
