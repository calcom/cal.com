"use client";

import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Dialog, ConfirmationDialogContent } from "@calcom/ui/components/dialog";
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

  const [orgDeletionState, setOrgDeletionState] = useState<{
    org: (typeof data)[number];
    requireUserRenamingConfirmation?: boolean;
    usersToRename?: {
      id: number;
      username: string;
    }[];
  } | null>(null);
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
                        id: "delete",
                        label: t("delete"),
                        onClick: () => {
                          setOrgDeletionState({
                            org,
                          });
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
      {orgDeletionState && orgDeletionState.org ? (
        orgDeletionState.requireUserRenamingConfirmation ? (
          <UserRenamingConfirmationDialog
            orgDeletionState={orgDeletionState}
            onConfirm={async () => {
              if (!orgDeletionState.org) return;
              const res = await deleteMutation.mutateAsync({
                orgId: orgDeletionState.org.id,
                userRenamingAcknowledged: true,
              });
              showToast(res.message, "success");
              setOrgDeletionState(null);
              await invalidateQueries(utils, {
                orgId: orgDeletionState.org.id,
              });
            }}
            onClose={() => {
              setOrgDeletionState(null);
            }}
          />
        ) : (
          <DeleteOrgDialog
            orgDeletionState={orgDeletionState}
            onClose={() => {
              setOrgDeletionState(null);
            }}
            onConfirm={async () => {
              if (!orgDeletionState.org) return;
              const res = await deleteMutation.mutateAsync({
                orgId: orgDeletionState.org.id,
              });
              if (res.requireUserRenamingConfirmation) {
                setOrgDeletionState((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    requireUserRenamingConfirmation: true,
                    usersToRename: res.usersToRename,
                  };
                });
              } else {
                showToast(res.message, "success");
                setOrgDeletionState(null);
                await invalidateQueries(utils, {
                  orgId: orgDeletionState.org.id,
                });
              }
            }}
          />
        )
      ) : null}
    </div>
  );
}

export default AdminOrgTable;
const ConfirmButton = ({
  onConfirm,
  confirmBtnText,
  loadingText,
}: {
  onConfirm: () => Promise<void>;
  confirmBtnText: string;
  loadingText: string;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  return (
    <Button
      color="primary"
      loading={isLoading}
      onClick={async (e) => {
        setIsLoading(true);
        await onConfirm();
        setIsLoading(false);
      }}
      data-testid="dialog-confirmation">
      {isLoading ? loadingText : confirmBtnText}
    </Button>
  );
};

const DeleteOrgDialog = ({
  orgDeletionState,
  onConfirm,
  onClose,
}: {
  orgDeletionState: {
    org: {
      id: number;
      name: string;
    };
    requireUserRenamingConfirmation?: boolean;
  } | null;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) => {
  const { t } = useLocale();
  if (!orgDeletionState) return null;
  return (
    // eslint-disable-next-line @typescript-eslint/no-empty-function -- noop
    <Dialog
      name="delete-user"
      open={!orgDeletionState.requireUserRenamingConfirmation}
      onOpenChange={(open) => {
        if (!open) {
          onClose?.();
        }
      }}>
      <ConfirmationDialogContent
        title={t("admin_delete_organization_title", {
          organizationName: orgDeletionState.org.name,
        })}
        cancelBtnText={t("cancel")}
        variety="danger"
        confirmBtn={
          <ConfirmButton onConfirm={onConfirm} confirmBtnText={t("delete")} loadingText={t("deleting")} />
        }>
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

const UserRenamingConfirmationDialog = ({
  orgDeletionState,
  onConfirm,
  onClose,
}: {
  orgDeletionState: {
    org: {
      id: number;
      name: string;
    };
    requireUserRenamingConfirmation?: boolean;
    usersToRename?: {
      id: number;
      username: string;
    }[];
  } | null;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) => {
  const { t } = useLocale();
  if (!orgDeletionState) return null;
  return (
    <Dialog
      name="delete-user"
      open={orgDeletionState.requireUserRenamingConfirmation}
      onOpenChange={(open) => {
        if (!open) {
          onClose?.();
        }
      }}>
      <ConfirmationDialogContent
        title={t("admin_delete_organization_title", {
          organizationName: orgDeletionState.org.name,
        })}
        cancelBtnText={t("cancel")}
        variety="danger"
        confirmBtn={
          <ConfirmButton
            onConfirm={onConfirm}
            confirmBtnText={t("confirm_user_renaming_and_delete")}
            loadingText={t("deleting")}
          />
        }>
        <span className="flex flex-col gap-2">
          <span className="text-muted-foreground text-sm">
            {t("these_users_will_be_renamed_to_avoid_username_conflicts")}
          </span>
          {orgDeletionState.usersToRename.map((user) => `${user.username} (ID: ${user.id})`).join(", ")}
        </span>
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
