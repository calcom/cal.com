"use client";

import { useState, useCallback, useMemo } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import { DropdownActions, Table } from "@calcom/ui/components/table";
import { showToast } from "@calcom/ui/components/toast";

import { subdomainSuffix } from "../../../../organizations/lib/orgDomains";

const { Body, Cell, ColumnTitle, Header, Row } = Table;

export function AdminOrgTable() {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [data] = trpc.viewer.organizations.adminGetAll.useSuspenseQuery();

  // Optimized invalidation function with batching
  const invalidateQueries = useCallback(
    async (orgId: number) => {
      // Batch invalidations to reduce re-renders
      await Promise.all([
        utils.viewer.organizations.adminGetAll.invalidate(),
        utils.viewer.organizations.adminGet.invalidate({ id: orgId }),
      ]);

      // Only refetch if necessary
      await utils.viewer.organizations.adminGet.refetch({ id: orgId });
    },
    [utils]
  );

  const updateMutation = trpc.viewer.organizations.adminUpdate.useMutation({
    onSuccess: async (_data, variables) => {
      showToast(t("org_has_been_processed"), "success");
      await invalidateQueries(variables.id);
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  const deleteMutation = trpc.viewer.organizations.adminDelete.useMutation({
    onSuccess: async (res, variables) => {
      showToast(res.message, "success");
      await invalidateQueries(variables.orgId);
    },
    onError: (err) => {
      console.error(err.message);
      showToast(t("org_error_processing"), "error");
    },
  });

  // Memoized publish function
  const publishOrg = useCallback(
    async (org: (typeof data)[number]) => {
      if (!org.metadata?.requestedSlug) {
        showToast(t("could_not_find_slug_to_publish_org"), "error");
        console.error("metadata.requestedSlug isn't set", org.metadata?.requestedSlug);
        return;
      }
      updateMutation.mutate({
        id: org.id,
        slug: org.metadata.requestedSlug,
      });
    },
    [updateMutation, t]
  );

  // Memoized action handlers to prevent function recreation on every render
  const createActionHandlers = useCallback(
    (org: (typeof data)[number]) => {
      const handleReview = () => {
        updateMutation.mutate({
          id: org.id,
          organizationSettings: {
            isAdminReviewed: true,
          },
        });
      };

      const handleDnsConfig = () => {
        updateMutation.mutate({
          id: org.id,
          organizationSettings: {
            isOrganizationConfigured: true,
          },
        });
      };

      const handlePublish = () => {
        publishOrg(org);
      };

      const handleApiToggle = () => {
        updateMutation.mutate({
          id: org.id,
          organizationSettings: {
            isAdminAPIEnabled: !org.organizationSettings?.isAdminAPIEnabled,
          },
        });
      };

      const handleDelete = () => {
        setOrgToDelete(org);
      };

      return {
        handleReview,
        handleDnsConfig,
        handlePublish,
        handleApiToggle,
        handleDelete,
      };
    },
    [updateMutation, publishOrg]
  );

  // Memoized actions generator
  const getActions = useCallback(
    (org: (typeof data)[number]) => {
      const handlers = createActionHandlers(org);

      return [
        // Review action
        ...(!org.organizationSettings?.isAdminReviewed
          ? [
              {
                id: "review",
                label: t("review"),
                onClick: handlers.handleReview,
                icon: "check" as const,
              },
            ]
          : []),
        // DNS configuration action
        ...(!org.organizationSettings?.isOrganizationConfigured
          ? [
              {
                id: "dns",
                label: t("mark_dns_configured"),
                onClick: handlers.handleDnsConfig,
                icon: "check-check" as const,
              },
            ]
          : []),
        // Edit action (always present)
        {
          id: "edit",
          label: t("edit"),
          href: `/settings/admin/organizations/${org.id}/edit`,
          icon: "pencil" as const,
        },
        // Publish action
        ...(!org.slug
          ? [
              {
                id: "publish",
                label: t("publish"),
                onClick: handlers.handlePublish,
                icon: "book-open-check" as const,
              },
            ]
          : []),
        // API toggle action
        {
          id: "api",
          label: org.organizationSettings?.isAdminAPIEnabled ? t("revoke_admin_api") : t("grant_admin_api"),
          onClick: handlers.handleApiToggle,
          icon: "terminal" as const,
        },
        // Delete action
        {
          id: "delete",
          label: t("delete"),
          onClick: handlers.handleDelete,
          icon: "trash" as const,
        },
      ];
    },
    [t, createActionHandlers]
  );

  // Memoized table rows to prevent unnecessary re-renders
  const tableRows = useMemo(() => {
    return data.map((org) => {
      const actions = getActions(org);

      return (
        <Row key={org.id}>
          <Cell widthClassNames="w-auto">
            <div className="text-subtle font-medium">
              <span className="text-default">{org.name}</span>
              <br />
              <span className="text-muted">
                {org.slug}.{subdomainSuffix()}
              </span>
            </div>
          </Cell>
          <Cell widthClassNames="w-auto">
            <span className="break-all">{org.members.length ? org.members[0].user.email : "No members"}</span>
          </Cell>
          <Cell>
            <div className="space-x-2">
              {!org.organizationSettings?.isAdminReviewed ? (
                <Badge variant="red">{t("unreviewed")}</Badge>
              ) : (
                <Badge variant="green">{t("reviewed")}</Badge>
              )}
            </div>
          </Cell>
          <Cell>
            <div className="space-x-2">
              {org.organizationSettings?.isOrganizationConfigured ? (
                <Badge variant="blue">{t("dns_configured")}</Badge>
              ) : (
                <Badge variant="red">{t("dns_missing")}</Badge>
              )}
            </div>
          </Cell>
          <Cell>
            <div className="space-x-2">
              {!org.slug ? (
                <Badge variant="red">{t("unpublished")}</Badge>
              ) : (
                <Badge variant="green">{t("published")}</Badge>
              )}
            </div>
          </Cell>
          <Cell>
            <div className="space-x-2">
              {!org.organizationSettings?.isAdminAPIEnabled ? (
                <Badge variant="red">{t("disabled")}</Badge>
              ) : (
                <Badge variant="green">{t("enabled")}</Badge>
              )}
            </div>
          </Cell>
          <Cell widthClassNames="w-auto">
            <div className="flex w-full justify-end">
              <DropdownActions actions={actions} />
            </div>
          </Cell>
        </Row>
      );
    });
  }, [data, getActions, t]);

  const [orgToDelete, setOrgToDelete] = useState<(typeof data)[number] | null>(null);

  // Memoized delete handler
  const handleDeleteConfirm = useCallback(() => {
    if (!orgToDelete) return;
    deleteMutation.mutate({
      orgId: orgToDelete.id,
    });
    setOrgToDelete(null);
  }, [orgToDelete, deleteMutation]);

  const handleDeleteClose = useCallback(() => {
    setOrgToDelete(null);
  }, []);

  return (
    <div>
      <Table>
        <Header>
          <ColumnTitle widthClassNames="w-auto">{t("organization")}</ColumnTitle>
          <ColumnTitle widthClassNames="w-auto">{t("owner")}</ColumnTitle>
          <ColumnTitle widthClassNames="w-auto">{t("reviewed")}</ColumnTitle>
          <ColumnTitle widthClassNames="w-auto">{t("dns_configured")}</ColumnTitle>
          <ColumnTitle widthClassNames="w-auto">{t("published")}</ColumnTitle>
          <ColumnTitle widthClassNames="w-auto">{t("admin_api")}</ColumnTitle>
          <ColumnTitle widthClassNames="w-auto">
            <span className="sr-only">{t("edit")}</span>
          </ColumnTitle>
        </Header>
        <Body>{tableRows}</Body>
      </Table>
      <DeleteOrgDialog org={orgToDelete} onClose={handleDeleteClose} onConfirm={handleDeleteConfirm} />
    </div>
  );
}

export default AdminOrgTable;

// Memoized Delete Dialog component
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
    <Dialog
      name="delete-user"
      open={!!org.id}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}>
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
