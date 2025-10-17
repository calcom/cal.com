"use client";

import { useState } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@calcom/ui/components/sheet";
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

  // Fetch validation data immediately when sheet opens
  const { data: validation, isLoading: isValidating } = trpc.viewer.admin.validateDowngrade.useQuery(
    { organizationId: org?.id ?? 0 },
    {
      enabled: !!org?.id,
      refetchOnWindowFocus: false,
    }
  );

  if (!org) {
    return null;
  }

  const hasCredits = (validation?.organizationCredits ?? 0) > 0;
  const availableTeams = validation?.availableTeamsForCredits ?? [];
  const hasBlockers = (validation?.blockers?.length ?? 0) > 0;
  const canDowngrade = validation?.canDowngrade ?? false;
  const teamsPreview = validation?.teamsPreview ?? [];
  const orgEventTypes = validation?.orgEventTypesToDelete ?? [];
  const membersToRemove = validation?.membersToRemove ?? [];

  return (
    <Sheet open={!!org.id} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>
            {t("admin_downgrade_organization_title", {
              organizationName: org.name,
            })}
          </SheetTitle>
        </SheetHeader>

        <SheetBody>
          {isValidating ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="border-subtle mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-r-transparent" />
                <p className="text-subtle text-sm">{t("validating_downgrade")}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Blockers Section */}
              {hasBlockers && (
                <div className="rounded-md border border-red-300 bg-red-50 p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <h3 className="text-sm font-medium text-red-800">
                        {t("cannot_downgrade_organization")}
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        <ul className="list-disc space-y-1 pl-5">
                          {validation?.blockers?.map((blocker, idx) => (
                            <li key={idx}>{blocker.message}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Warnings Section */}
              {!hasBlockers && validation?.warnings && validation.warnings.length > 0 && (
                <div className="rounded-md border border-yellow-300 bg-yellow-50 p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <h3 className="text-sm font-medium text-yellow-800">{t("downgrade_warnings")}</h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <ul className="list-disc space-y-1 pl-5">
                          {validation.warnings.map((warning, idx) => (
                            <li key={idx}>{warning.message}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Teams Preview Section */}
              {!hasBlockers && teamsPreview.length > 0 && (
                <div className="rounded-md border border-gray-200 p-4">
                  <h4 className="text-sm font-medium text-gray-900">
                    {t("teams_to_be_created")} ({teamsPreview.length})
                  </h4>
                  <p className="text-subtle mt-1 text-sm">
                    {t("teams_to_be_created_description")}
                  </p>
                  <div className="mt-3 space-y-2">
                    {teamsPreview.map((team) => (
                      <div
                        key={team.teamId}
                        className="bg-subtle flex items-center justify-between rounded-md p-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{team.teamName}</span>
                            {team.hasSlugConflict && (
                              <Badge variant="orange">{t("slug_changed")}</Badge>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                            <code className="rounded bg-gray-100 px-2 py-1">{team.newSlug}</code>
                            <span>• {team.memberCount} {t("members")}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Username Conflicts Section */}
              {!hasBlockers &&
                validation?.conflictResolutions &&
                validation.conflictResolutions.usernames.filter((u) => u.hadConflict).length > 0 && (
                  <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
                    <h4 className="text-sm font-medium text-blue-900">{t("username_conflicts")}</h4>
                    <p className="text-subtle mt-1 text-sm text-blue-700">
                      {t("username_conflicts_description")}
                    </p>
                    <div className="mt-3 space-y-2">
                      {validation.conflictResolutions.usernames
                        .filter((u) => u.hadConflict)
                        .slice(0, 5)
                        .map((resolution, idx) => (
                          <div key={idx} className="flex items-center text-sm">
                            <span className="text-blue-700">
                              <code className="rounded bg-blue-100 px-2 py-1">
                                {resolution.originalUsername}
                              </code>
                              {" → "}
                              <code className="rounded bg-blue-100 px-2 py-1">
                                {resolution.resolvedUsername}
                              </code>
                            </span>
                          </div>
                        ))}
                      {validation.conflictResolutions.usernames.filter((u) => u.hadConflict).length > 5 && (
                        <p className="text-xs text-blue-600">
                          +{validation.conflictResolutions.usernames.filter((u) => u.hadConflict).length - 5}{" "}
                          more
                        </p>
                      )}
                    </div>
                  </div>
                )}

              {/* Org Event Types to be Deleted */}
              {!hasBlockers && orgEventTypes.length > 0 && (
                <div className="rounded-md border border-orange-200 bg-orange-50 p-4">
                  <h4 className="text-sm font-medium text-orange-900">
                    {t("org_event_types_to_delete")} ({orgEventTypes.length})
                  </h4>
                  <p className="text-subtle mt-1 text-sm text-orange-700">
                    {t("org_event_types_to_delete_description")}
                  </p>
                  <div className="mt-3 space-y-2">
                    {orgEventTypes.slice(0, 5).map((eventType) => (
                      <div key={eventType.id} className="flex items-center gap-2 text-sm text-orange-800">
                        <code className="rounded bg-orange-100 px-2 py-1">{eventType.slug}</code>
                        <span className="text-xs">({eventType.length} min)</span>
                      </div>
                    ))}
                    {orgEventTypes.length > 5 && (
                      <p className="text-xs text-orange-600">+{orgEventTypes.length - 5} more</p>
                    )}
                  </div>
                </div>
              )}

              {/* Members to be Removed */}
              {!hasBlockers && membersToRemove.length > 0 && (
                <div className="rounded-md border border-red-200 bg-red-50 p-4">
                  <h4 className="text-sm font-medium text-red-900">
                    {t("members_to_be_removed")} ({membersToRemove.length})
                  </h4>
                  <p className="text-subtle mt-1 text-sm text-red-700">
                    {t("members_to_be_removed_description")}
                  </p>
                  <div className="mt-3 space-y-2">
                    {membersToRemove.slice(0, 5).map((member) => (
                      <div key={member.userId} className="text-sm text-red-800">
                        {member.email}
                        {member.username && (
                          <span className="text-xs text-red-600"> (@{member.username})</span>
                        )}
                      </div>
                    ))}
                    {membersToRemove.length > 5 && (
                      <p className="text-xs text-red-600">+{membersToRemove.length - 5} more</p>
                    )}
                  </div>
                </div>
              )}

              {/* Credit Allocation Section */}
              {!hasBlockers && hasCredits && availableTeams.length > 0 && (
                <div className="rounded-md border border-gray-200 p-4">
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
            </div>
          )}
        </SheetBody>

        <SheetFooter>
          <Button color="minimal" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            color="destructive"
            disabled={isValidating || hasBlockers}
            onClick={() => {
              onConfirm(selectedTeamForCredits);
              onClose();
            }}>
            {isValidating ? t("validating") : t("downgrade")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
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
