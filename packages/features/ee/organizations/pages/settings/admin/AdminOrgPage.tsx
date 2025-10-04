"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import {
  DataTableProvider,
  DataTableWrapper,
  DataTableToolbar,
  DataTableFilters,
  DataTableSegment,
  useColumnFilters,
  ColumnFilterType,
  useDataTable,
  convertFacetedValuesToMap,
} from "@calcom/features/data-table";
import { useSegments } from "@calcom/features/data-table/hooks/useSegments";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import { DropdownActions } from "@calcom/ui/components/table";
import { showToast } from "@calcom/ui/components/toast";

import { subdomainSuffix } from "../../../../organizations/lib/orgDomains";

type Organization = RouterOutputs["viewer"]["organizations"]["adminGetAll"]["rows"][number];

export function AdminOrgTable() {
  return (
    <DataTableProvider tableIdentifier="admin-organizations" useSegments={useSegments} defaultPageSize={10}>
      <AdminOrgTableContent />
    </DataTableProvider>
  );
}

function AdminOrgTableContent() {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);

  const columnFilters = useColumnFilters();
  const { limit, offset, searchTerm } = useDataTable();

  const { data, isPending } = trpc.viewer.organizations.adminGetAll.useQuery(
    {
      limit,
      offset,
      searchTerm,
      filters: columnFilters,
    },
    {
      placeholderData: keepPreviousData,
    }
  );

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

  const publishOrg = async (org: Organization) => {
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

  const flatData = useMemo<Organization[]>(() => data?.rows ?? [], [data]);
  const totalRowCount = data?.meta?.totalRowCount ?? 0;

  const columns = useMemo<ColumnDef<Organization>[]>(
    () => [
      {
        id: "name",
        header: t("organization"),
        accessorFn: (org) => org.name,
        enableColumnFilter: true,
        meta: {
          filter: { type: ColumnFilterType.TEXT },
        },
        cell: ({ row }) => {
          const org = row.original;
          return (
            <div className="text-subtle font-medium">
              <span className="text-default">{org.name}</span>
              <br />
              <span className="text-muted">
                {org.slug}.{subdomainSuffix()}
              </span>
            </div>
          );
        },
      },
      {
        id: "owner",
        header: t("owner"),
        accessorFn: (org) => (org.members.length ? org.members[0].user.email : "No members"),
        enableColumnFilter: false,
        cell: ({ row }) => {
          const org = row.original;
          return (
            <span className="break-all">{org.members.length ? org.members[0].user.email : "No members"}</span>
          );
        },
      },
      {
        id: "reviewed",
        header: t("reviewed"),
        accessorFn: (org) => org.organizationSettings?.isAdminReviewed,
        enableColumnFilter: true,
        meta: {
          filter: {
            type: ColumnFilterType.SINGLE_SELECT,
          },
        },
        cell: ({ row }) => {
          const org = row.original;
          return (
            <div className="space-x-2">
              {!org.organizationSettings?.isAdminReviewed ? (
                <Badge variant="red">{t("unreviewed")}</Badge>
              ) : (
                <Badge variant="green">{t("reviewed")}</Badge>
              )}
            </div>
          );
        },
      },
      {
        id: "dnsConfigured",
        header: t("dns_configured"),
        accessorFn: (org) => org.organizationSettings?.isOrganizationConfigured,
        enableColumnFilter: true,
        meta: {
          filter: {
            type: ColumnFilterType.SINGLE_SELECT,
          },
        },
        cell: ({ row }) => {
          const org = row.original;
          return (
            <div className="space-x-2">
              {org.organizationSettings?.isOrganizationConfigured ? (
                <Badge variant="blue">{t("dns_configured")}</Badge>
              ) : (
                <Badge variant="red">{t("dns_missing")}</Badge>
              )}
            </div>
          );
        },
      },
      {
        id: "published",
        header: t("published"),
        accessorFn: (org) => !!org.slug,
        enableColumnFilter: true,
        meta: {
          filter: {
            type: ColumnFilterType.SINGLE_SELECT,
          },
        },
        cell: ({ row }) => {
          const org = row.original;
          return (
            <div className="space-x-2">
              {!org.slug ? (
                <Badge variant="red">{t("unpublished")}</Badge>
              ) : (
                <Badge variant="green">{t("published")}</Badge>
              )}
            </div>
          );
        },
      },
      {
        id: "adminApi",
        header: t("admin_api"),
        accessorFn: (org) => org.organizationSettings?.isAdminAPIEnabled,
        enableColumnFilter: true,
        meta: {
          filter: {
            type: ColumnFilterType.SINGLE_SELECT,
          },
        },
        cell: ({ row }) => {
          const org = row.original;
          return (
            <div className="space-x-2">
              {!org.organizationSettings?.isAdminAPIEnabled ? (
                <Badge variant="red">{t("disabled")}</Badge>
              ) : (
                <Badge variant="green">{t("enabled")}</Badge>
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        enableSorting: false,
        enableColumnFilter: false,
        cell: ({ row }) => {
          const org = row.original;
          return (
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
          );
        },
      },
    ],
    [t, updateMutation, publishOrg, setOrgToDelete]
  );

  const table = useReactTable({
    data: flatData,
    columns,
    manualPagination: true,
    initialState: {
      columnPinning: {
        right: ["actions"],
      },
    },
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => `${row.id}`,
  });

  return (
    <>
      <DataTableWrapper<Organization>
        testId="admin-org-data-table"
        table={table}
        isPending={isPending}
        totalRowCount={totalRowCount}
        paginationMode="standard"
        containerClassName="max-w-full"
        ToolbarLeft={
          <>
            <DataTableToolbar.SearchBar />
          </>
        }
        ToolbarRight={
          <>
            <DataTableFilters.ColumnVisibilityButton table={table} />
          </>
        }
      />

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
    </>
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
        <ul className="ml-4 mt-5 list-disc space-y-2">
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
  await utils.viewer.organizations.adminGetAll.invalidate();
  await utils.viewer.organizations.adminGet.invalidate({
    id: data.orgId,
  });
  // Due to some super weird reason, just invalidate doesn't work, so do refetch as well.
  await utils.viewer.organizations.adminGet.refetch({
    id: data.orgId,
  });
}
