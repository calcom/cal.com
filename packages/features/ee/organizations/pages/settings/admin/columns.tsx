"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import { DropdownActions } from "@calcom/ui/components/table";
import { showToast } from "@calcom/ui/components/toast";

import { subdomainSuffix } from "../../../../organizations/lib/orgDomains";

export type OrganizationData = {
  id: number;
  name: string;
  slug: string | null;
  metadata: {
    requestedSlug?: string;
    [key: string]: unknown;
  };
  organizationSettings: {
    isAdminReviewed?: boolean;
    isOrganizationConfigured?: boolean;
    isAdminAPIEnabled?: boolean;
    [key: string]: unknown;
  };
  createdAt: Date;
  members: Array<{
    user: {
      id: number;
      name: string | null;
      email: string;
    };
  }>;
};

export function useOrganizationColumns(): ColumnDef<OrganizationData>[] {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [orgToDelete, setOrgToDelete] = useState<OrganizationData | null>(null);

  const updateMutation = trpc.viewer.organizations.adminUpdate.useMutation({
    onSuccess: async () => {
      showToast(t("org_has_been_processed"), "success");
      await utils.viewer.organizations.adminGetAll.invalidate();
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  const deleteMutation = trpc.viewer.organizations.adminDelete.useMutation({
    onSuccess: async (res) => {
      showToast(res.message, "success");
      await utils.viewer.organizations.adminGetAll.invalidate();
      setOrgToDelete(null);
    },
    onError: (err) => {
      console.error(err.message);
      showToast(t("org_error_processing"), "error");
    },
  });

  const publishOrg = async (org: OrganizationData) => {
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

  return [
    {
      accessorKey: "name",
      header: t("organization"),
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
      accessorKey: "members",
      header: t("owner"),
      cell: ({ row }) => {
        const org = row.original;
        return (
          <span className="break-all">{org.members.length ? org.members[0].user.email : "No members"}</span>
        );
      },
    },
    {
      accessorKey: "organizationSettings.isAdminReviewed",
      header: t("reviewed"),
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
      accessorKey: "organizationSettings.isOrganizationConfigured",
      header: t("dns_configured"),
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
      accessorKey: "slug",
      header: t("published"),
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
      accessorKey: "organizationSettings.isAdminAPIEnabled",
      header: t("admin_api"),
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
      header: () => <span className="sr-only">{t("edit")}</span>,
      cell: ({ row }) => {
        const org = row.original;
        return (
          <>
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
            <Dialog
              name="delete-user"
              open={!!orgToDelete?.id}
              onOpenChange={(open) => (open ? () => {} : () => setOrgToDelete(null))}>
              <ConfirmationDialogContent
                title={t("admin_delete_organization_title", {
                  organizationName: orgToDelete?.name,
                })}
                confirmBtnText={t("delete")}
                cancelBtnText={t("cancel")}
                variety="danger"
                onConfirm={() => {
                  if (!orgToDelete) return;
                  deleteMutation.mutate({
                    orgId: orgToDelete.id,
                  });
                }}>
                <ul className="ml-4 mt-5 list-disc space-y-2">
                  <li>{t("admin_delete_organization_description_1")}</li>
                  <li>{t("admin_delete_organization_description_2")}</li>
                  <li>{t("admin_delete_organization_description_3")}</li>
                  <li>{t("admin_delete_organization_description_4")}</li>
                </ul>
              </ConfirmationDialogContent>
            </Dialog>
          </>
        );
      },
    },
  ];
}
