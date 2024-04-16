"use client";

import { Trans } from "next-i18next";
import { useState } from "react";

import NoSSR from "@calcom/core/components/NoSSR";
import LicenseRequired from "@calcom/ee/common/components/LicenseRequired";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Badge,
  ConfirmationDialogContent,
  Dialog,
  DropdownActions,
  Meta,
  showToast,
  Table,
} from "@calcom/ui";

import { getLayout } from "../../../../../settings/layouts/SettingsLayout";
import { subdomainSuffix } from "../../../../organizations/lib/orgDomains";

const { Body, Cell, ColumnTitle, Header, Row } = Table;

function AdminOrgTable() {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [data] = trpc.viewer.organizations.adminGetAll.useSuspenseQuery();
  const verifyMutation = trpc.viewer.organizations.adminVerify.useMutation({
    onSuccess: async (_data, variables) => {
      showToast(t("org_has_been_processed"), "success");
      await invalidateQueries(utils, variables);
    },
    onError: (err) => {
      console.error(err.message);
      showToast(t("org_error_processing"), "error");
    },
  });
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

  const publishOrg = async (org: (typeof data)[number]) => {
    if (!org.metadata?.requestedSlug) {
      showToast(t("org_publish_error"), "error");
      console.error("metadata.requestedSlug isn't set", org.metadata?.requestedSlug);
      return;
    }
    updateMutation.mutate({
      id: org.id,
      slug: org.metadata.requestedSlug,
    });
  };

  const [orgToDelete, setOrgToDelete] = useState<(typeof data)[number] | null>(null);
  return (
    <div>
      <Table>
        <Header>
          <ColumnTitle widthClassNames="w-auto">{t("organization")}</ColumnTitle>
          <ColumnTitle widthClassNames="w-auto">{t("owner")}</ColumnTitle>
          <ColumnTitle widthClassNames="w-auto">{t("reviewed")}</ColumnTitle>
          <ColumnTitle widthClassNames="w-auto">{t("dns_configured")}</ColumnTitle>
          <ColumnTitle widthClassNames="w-auto">{t("published")}</ColumnTitle>
          <ColumnTitle widthClassNames="w-auto">
            <span className="sr-only">{t("edit")}</span>
          </ColumnTitle>
        </Header>
        <Body>
          {data.map((org) => (
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
                <span className="break-all">
                  {org.members.length ? org.members[0].user.email : "No members"}
                </span>
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
          ))}
        </Body>
      </Table>
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

const AdminOrgList = () => {
  const { t } = useLocale();
  return (
    <LicenseRequired>
      <Meta title={t("organizations")} description={t("orgs_page_description")} />
      <NoSSR>
        <AdminOrgTable />
      </NoSSR>
    </LicenseRequired>
  );
};

AdminOrgList.getLayout = getLayout;

export default AdminOrgList;

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
        <Trans
          i18nKey="admin_delete_organization_description"
          components={{ li: <li />, ul: <ul className="ml-4 mt-5 list-disc space-y-2" /> }}>
          <ul>
            <li>
              Teams that are member of this organization will also be deleted along with their event-types
            </li>
            <li>
              Users that were part of the organization will not be deleted and their event-types will also
              remain intact.
            </li>
            <li>Usernames would be changed to allow them to exist outside the organization</li>
          </ul>
        </Trans>
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
