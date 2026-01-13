"use client";

import dayjs from "@calcom/dayjs";
import { Dialog } from "@calcom/features/components/controlled-dialog";
import { subdomainSuffix } from "@calcom/features/ee/organizations/lib/orgDomains";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import { TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { DropdownActions, Table } from "@calcom/ui/components/table";
import { showToast } from "@calcom/ui/components/toast";
import { keepPreviousData } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const { Body, Cell, ColumnTitle, Header, Row } = Table;

const FETCH_LIMIT = 25;

export function AdminOrgTable() {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const { data, fetchNextPage, isFetching, hasNextPage } =
    trpc.viewer.organizations.adminGetAllPaginated.useInfiniteQuery(
      {
        limit: FETCH_LIMIT,
        searchTerm: debouncedSearchTerm,
      },
      {
        enabled: debouncedSearchTerm.length >= 2,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        placeholderData: keepPreviousData,
        refetchOnWindowFocus: false,
      }
    );

  const flatData = useMemo(() => data?.pages?.flatMap((page) => page.rows) ?? [], [data]);

  const fetchMoreOnBottomReached = useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      if (containerRefElement) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
        if (scrollHeight - scrollTop - clientHeight < 300 && !isFetching && hasNextPage) {
          fetchNextPage();
        }
      }
    },
    [fetchNextPage, isFetching, hasNextPage]
  );

  useEffect(() => {
    fetchMoreOnBottomReached(tableContainerRef.current);
  }, [fetchMoreOnBottomReached]);

  const updateMutation = trpc.viewer.organizations.adminUpdate.useMutation({
    onSuccess: async (_data, variables) => {
      showToast(t("org_has_been_processed"), "success");
      await invalidateQueries(utils, {
        orgId: variables.id,
      });
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  const deleteMutation = trpc.viewer.organizations.adminDelete.useMutation({
    onSuccess: async (res, variables) => {
      showToast(res.message, "success");
      await invalidateQueries(utils, variables);
    },
    onError: (err) => {
      console.error(err.message);
      showToast(t("org_error_processing"), "error");
    },
  });

  const publishOrg = async (org: (typeof flatData)[number]) => {
    if (!org.metadata?.requestedSlug) {
      showToast(t("could_not_find_slug_to_publish_org"), "error");
      console.error("metadata.requestedSlug isn't set", org.metadata?.requestedSlug);
      return;
    }
    updateMutation.mutate({
      id: org.id,
      slug: org.metadata.requestedSlug,
    });
  };

  const [orgToDelete, setOrgToDelete] = useState<(typeof flatData)[number] | null>(null);

  const hasSearched = debouncedSearchTerm.length >= 2;
  const showEmptyState = !hasSearched;
  const showNoResults = hasSearched && flatData.length === 0 && !isFetching;
  const showResults = hasSearched && flatData.length > 0;

  return (
    <div>
      <TextField
        placeholder={t("search_organizations_placeholder")}
        label={t("search")}
        addOnLeading={<Icon name="search" className="text-subtle h-4 w-4" />}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-md"
      />

      {showEmptyState && (
        <div className="bg-muted border-muted mt-5 rounded-xl border p-1">
          <div className="bg-default border-muted flex flex-col items-center justify-center rounded-[10px] border px-5 py-16">
            <Icon name="building" className="text-subtle mb-4 h-12 w-12" />
            <h3 className="text-emphasis text-lg font-semibold">{t("search_organizations")}</h3>
            <p className="text-subtle mt-2 text-sm">{t("search_organizations_description")}</p>
          </div>
        </div>
      )}

      {showNoResults && (
        <div className="bg-muted border-muted mt-5 rounded-xl border p-1">
          <div className="bg-default border-muted flex flex-col items-center justify-center rounded-[10px] border px-5 py-16">
            <Icon name="building-2" className="text-subtle mb-4 h-12 w-12" />
            <h3 className="text-emphasis text-lg font-semibold">{t("no_results")}</h3>
            <p className="text-subtle mt-2 text-sm">
              {t("no_organizations_found_for_search", { searchTerm: debouncedSearchTerm })}
            </p>
          </div>
        </div>
      )}

      {showResults && (
        <div className="bg-muted border-muted mt-5 rounded-xl border p-1">
          <div
            className="bg-default border-muted rounded-[10px] border"
            ref={tableContainerRef}
            onScroll={() => fetchMoreOnBottomReached()}
            style={{
              height: "calc(100vh - 30vh)",
              overflow: "auto",
            }}>
            <Table>
              <Header>
                <ColumnTitle widthClassNames="w-auto">{t("organization")}</ColumnTitle>
                <ColumnTitle widthClassNames="w-auto">{t("owner")}</ColumnTitle>
                <ColumnTitle>{t("members")}</ColumnTitle>
                <ColumnTitle>{t("teams")}</ColumnTitle>
                <ColumnTitle>{t("status")}</ColumnTitle>
                <ColumnTitle>{t("created")}</ColumnTitle>
                <ColumnTitle widthClassNames="w-auto">
                  <span className="sr-only">{t("edit")}</span>
                </ColumnTitle>
              </Header>
              <Body>
                {flatData.map((org) => {
                  const owner = org.members[0]?.user;
                  const isReviewed = org.organizationSettings?.isAdminReviewed;
                  const isDnsConfigured = org.organizationSettings?.isOrganizationConfigured;
                  const isPublished = !!org.slug;
                  const isApiEnabled = org.organizationSettings?.isAdminAPIEnabled;

                  return (
                    <Row key={org.id}>
                      <Cell widthClassNames="w-auto">
                        <div className="flex items-start gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-default font-medium">{org.name}</span>
                              {isReviewed ? (
                                <Icon name="circle-check" className="text-success h-4 w-4" />
                              ) : (
                                <Icon name="circle-x" className="text-error h-4 w-4" />
                              )}
                            </div>
                            <div className="text-muted text-xs">
                              {org.slug ? (
                                <span>
                                  {org.slug}.{subdomainSuffix()}
                                </span>
                              ) : (
                                <span className="text-attention">
                                  {org.metadata?.requestedSlug || "no-slug"}.{subdomainSuffix()} (pending)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Cell>
                      <Cell widthClassNames="w-auto">
                        {owner ? (
                          <div>
                            <div className="text-default text-sm font-medium">{owner.name || "No name"}</div>
                            <div className="text-muted break-all text-xs">{owner.email}</div>
                          </div>
                        ) : (
                          <span className="text-muted text-xs">No owner</span>
                        )}
                      </Cell>
                      <Cell>
                        <div className="flex items-center gap-1">
                          <Icon name="users" className="text-subtle h-3.5 w-3.5" />
                          <span className="text-default text-xs font-medium">{org._count?.members ?? 0}</span>
                        </div>
                      </Cell>
                      <Cell>
                        <div className="flex items-center gap-1">
                          <Icon name="layers" className="text-subtle h-3.5 w-3.5" />
                          <span className="text-default text-xs font-medium">
                            {org.children?.length ?? 0}
                          </span>
                        </div>
                      </Cell>
                      <Cell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex items-center gap-1"
                              title={isPublished ? "Published" : "Not published"}>
                              {isPublished ? (
                                <Icon name="check" className="text-success h-3.5 w-3.5" />
                              ) : (
                                <Icon name="x" className="text-error h-3.5 w-3.5" />
                              )}
                              <span className="text-subtle text-xs">Published</span>
                            </div>
                            <div
                              className="flex items-center gap-1"
                              title={isDnsConfigured ? "DNS configured" : "DNS not configured"}>
                              {isDnsConfigured ? (
                                <Icon name="check" className="text-success h-3.5 w-3.5" />
                              ) : (
                                <Icon name="x" className="text-error h-3.5 w-3.5" />
                              )}
                              <span className="text-subtle text-xs">DNS</span>
                            </div>
                            <div
                              className="flex items-center gap-1"
                              title={isApiEnabled ? "Admin API enabled" : "Admin API disabled"}>
                              {isApiEnabled ? (
                                <Icon name="check" className="text-success h-3.5 w-3.5" />
                              ) : (
                                <Icon name="x" className="text-error h-3.5 w-3.5" />
                              )}
                              <span className="text-subtle text-xs">API</span>
                            </div>
                          </div>
                        </div>
                      </Cell>
                      <Cell>
                        <span
                          className="text-subtle text-xs"
                          title={dayjs(org.createdAt).format("MMMM D, YYYY")}>
                          {dayjs(org.createdAt).fromNow()}
                        </span>
                      </Cell>
                      <Cell widthClassNames="w-auto">
                        <div className="flex w-full justify-end">
                          <DropdownActions
                            actions={[
                              ...(!org.organizationSettings?.isAdminReviewed
                                ? [
                                    {
                                      id: "review",
                                      label: t("review"),
                                      onClick: () => {
                                        updateMutation.mutate({
                                          id: org.id,
                                          organizationSettings: {
                                            isAdminReviewed: true,
                                          },
                                        });
                                      },
                                      icon: "check" as const,
                                    },
                                  ]
                                : []),
                              ...(!org.organizationSettings?.isOrganizationConfigured
                                ? [
                                    {
                                      id: "dns",
                                      label: t("mark_dns_configured"),
                                      onClick: () => {
                                        updateMutation.mutate({
                                          id: org.id,
                                          organizationSettings: {
                                            isOrganizationConfigured: true,
                                          },
                                        });
                                      },
                                      icon: "check-check" as const,
                                    },
                                  ]
                                : []),
                              {
                                id: "edit",
                                label: t("edit"),
                                href: `/settings/admin/organizations/${org.id}/edit`,
                                icon: "pencil" as const,
                              },
                              ...(!org.slug
                                ? [
                                    {
                                      id: "publish",
                                      label: t("publish"),
                                      onClick: () => {
                                        publishOrg(org);
                                      },
                                      icon: "book-open-check" as const,
                                    },
                                  ]
                                : []),
                              {
                                id: "api",
                                label: org.organizationSettings?.isAdminAPIEnabled
                                  ? t("revoke_admin_api")
                                  : t("grant_admin_api"),
                                onClick: () => {
                                  updateMutation.mutate({
                                    id: org.id,
                                    organizationSettings: {
                                      isAdminAPIEnabled: !org.organizationSettings?.isAdminAPIEnabled,
                                    },
                                  });
                                },
                                icon: "terminal" as const,
                              },
                              {
                                id: "delete",
                                label: t("delete"),
                                onClick: () => {
                                  setOrgToDelete(org);
                                },
                                icon: "trash" as const,
                              },
                            ]}
                          />
                        </div>
                      </Cell>
                    </Row>
                  );
                })}
              </Body>
            </Table>
          </div>
        </div>
      )}

      <DeleteOrgDialog
        org={orgToDelete}
        onClose={() => setOrgToDelete(null)}
        onConfirm={() => {
          if (!orgToDelete) return;
          deleteMutation.mutate({
            orgId: orgToDelete.id,
          });
        }}
      />
    </div>
  );
}

export default AdminOrgTable;

const DeleteOrgDialog = ({
  org,
  onConfirm,
  onClose,
}: {
  org: {
    id: number;
    name: string;
  } | null;
  onConfirm: () => void;
  onClose: () => void;
}) => {
  const { t } = useLocale();
  if (!org) {
    return null;
  }
  return (
    // eslint-disable-next-line @typescript-eslint/no-empty-function -- noop
    <Dialog name="delete-user" open={!!org.id} onOpenChange={(open) => (open ? () => {} : onClose())}>
      <ConfirmationDialogContent
        title={t("admin_delete_organization_title", {
          organizationName: org.name,
        })}
        confirmBtnText={t("delete")}
        cancelBtnText={t("cancel")}
        variety="danger"
        onConfirm={onConfirm}>
        <ul className="stack-y-2 ml-4 mt-5 list-disc">
          <li>{t("admin_delete_organization_description_1")}</li>
          <li>{t("admin_delete_organization_description_2")}</li>
          <li>{t("admin_delete_organization_description_3")}</li>
          <li>{t("admin_delete_organization_description_4")}</li>
        </ul>
      </ConfirmationDialogContent>
    </Dialog>
  );
};

async function invalidateQueries(utils: ReturnType<typeof trpc.useUtils>, data: { orgId: number }) {
  await utils.viewer.organizations.adminGetAllPaginated.invalidate();
  await utils.viewer.organizations.adminGet.invalidate({
    id: data.orgId,
  });
  // Due to some super weird reason, just invalidate doesn't work, so do refetch as well.
  await utils.viewer.organizations.adminGet.refetch({
    id: data.orgId,
  });
}
