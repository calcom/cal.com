"use client";

import { useState } from "react";

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
      showToast(t("could_not_find_slug_to_publish_org"), "error");
      console.error("metadata.requestedSlug isn't set", org.metadata?.requestedSlug);
      return;
    }
    updateMutation.mutate({
      id: org.id,
      slug: org.metadata.requestedSlug,
    });
  };

  const downgradeMutation = trpc.viewer.admin.downgradeOrganization.useMutation({
    onSuccess: async (result, variables) => {
      showToast(
        t("org_downgraded_successfully", {
          teamsCount: result.teams.length,
          membersRemoved: result.removedMembers.length,
        }),
        "success"
      );
      await invalidateQueries(utils, { orgId: variables.organizationId });
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  const [orgToDelete, setOrgToDelete] = useState<(typeof data)[number] | null>(null);
  const [orgToDowngrade, setOrgToDowngrade] = useState<(typeof data)[number] | null>(null);
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
                        id: "downgrade",
                        label: t("downgrade_to_teams"),
                        onClick: () => {
                          setOrgToDowngrade(org);
                        },
                        icon: "arrow-down-to-line" as const,
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
          ))}
        </Body>
      </Table>
      <DowngradeOrgDialog
        org={orgToDowngrade}
        onClose={() => setOrgToDowngrade(null)}
        onConfirm={(targetTeamIdForCredits) => {
          if (!orgToDowngrade) return;
          downgradeMutation.mutate({
            organizationId: orgToDowngrade.id,
            targetTeamIdForCredits,
          });
          setOrgToDowngrade(null);
        }}
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
    </div>
  );
}

export default AdminOrgTable;

const DowngradeOrgDialog = ({
  org,
  onConfirm,
  onClose,
}: {
  org: {
    id: number;
    name: string;
  } | null;
  onConfirm: (targetTeamIdForCredits?: number) => void;
  onClose: () => void;
}) => {
  const { t } = useLocale();
  const [selectedTeamForCredits, setSelectedTeamForCredits] = useState<number | undefined>();

  // Fetch validation data to get available teams and credit info
  const { data: validation } = trpc.viewer.admin.validateDowngrade.useQuery(
    { organizationId: org?.id ?? 0 },
    { enabled: !!org?.id }
  );

  if (!org) {
    return null;
  }

  const hasCredits = (validation?.organizationCredits ?? 0) > 0;
  const availableTeams = validation?.availableTeamsForCredits ?? [];

  return (
    // eslint-disable-next-line @typescript-eslint/no-empty-function -- noop
    <Dialog name="downgrade-org" open={!!org.id} onOpenChange={(open) => (open ? () => {} : onClose())}>
      <ConfirmationDialogContent
        title={t("admin_downgrade_organization_title", {
          organizationName: org.name,
        })}
        confirmBtnText={t("downgrade")}
        cancelBtnText={t("cancel")}
        variety="danger"
        onConfirm={() => onConfirm(selectedTeamForCredits)}>
        <p className="mb-4">{t("admin_downgrade_organization_description")}</p>
        <ul className="ml-4 mt-5 list-disc space-y-2">
          <li>{t("admin_downgrade_organization_point_1")}</li>
          <li>{t("admin_downgrade_organization_point_2")}</li>
          <li>{t("admin_downgrade_organization_point_3")}</li>
          <li>{t("admin_downgrade_organization_point_4")}</li>
          <li>{t("admin_downgrade_organization_point_5")}</li>
        </ul>

        {hasCredits && availableTeams.length > 0 && (
          <div className="mt-6 rounded-md border border-gray-200 p-4">
            <h4 className="text-sm font-medium text-gray-900">
              {t("admin_downgrade_credit_allocation")}
            </h4>
            <p className="text-subtle mt-1 text-sm">
              {t("admin_downgrade_credit_allocation_description", {
                credits: validation?.organizationCredits,
              })}
            </p>
            <div className="mt-3">
              <label htmlFor="credit-team-select" className="text-sm font-medium text-gray-700">
                {t("admin_downgrade_select_team_for_credits")}
              </label>
              <select
                id="credit-team-select"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                value={selectedTeamForCredits ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedTeamForCredits(value ? Number(value) : undefined);
                }}>
                <option value="">{t("admin_downgrade_distribute_evenly")}</option>
                {availableTeams.map((team) => (
                  <option key={team.teamId} value={team.teamId}>
                    {team.teamName} ({team.memberCount} {t("members")})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </ConfirmationDialogContent>
    </Dialog>
  );
};

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
