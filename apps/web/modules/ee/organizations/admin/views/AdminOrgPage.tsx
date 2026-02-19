"use client";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { subdomainSuffix } from "@calcom/features/ee/organizations/lib/orgDomains";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import { Table } from "@calcom/ui/components/table";
import { showToast } from "@calcom/ui/components/toast";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
  MenuTrigger,
} from "@coss/ui/components/menu";
import {
  BookOpenCheckIcon,
  CheckCheckIcon,
  CheckIcon,
  CreditCardIcon,
  PencilIcon,
  TerminalIcon,
  TrashIcon,
} from "@coss/ui/icons";
import { useState } from "react";

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
      console.error(
        "metadata.requestedSlug isn't set",
        org.metadata?.requestedSlug
      );
      return;
    }
    updateMutation.mutate({
      id: org.id,
      slug: org.metadata.requestedSlug,
    });
  };

  const [orgToDelete, setOrgToDelete] = useState<(typeof data)[number] | null>(
    null
  );
  return (
    <div>
      <Table>
        <Header>
          <ColumnTitle widthClassNames="w-auto">
            {t("organization")}
          </ColumnTitle>
          <ColumnTitle widthClassNames="w-auto">{t("owner")}</ColumnTitle>
          <ColumnTitle widthClassNames="w-auto">{t("reviewed")}</ColumnTitle>
          <ColumnTitle widthClassNames="w-auto">
            {t("dns_configured")}
          </ColumnTitle>
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
                  {org.members.length
                    ? org.members[0].user.email
                    : "No members"}
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
                  <Menu>
                    <MenuTrigger
                      render={
                        <Button
                          type="button"
                          color="secondary"
                          variant="icon"
                          StartIcon="ellipsis"
                        />
                      }
                    />
                    <MenuPopup align="end">
                      {!org.organizationSettings?.isAdminReviewed && (
                        <MenuItem
                          onClick={() => {
                            updateMutation.mutate({
                              id: org.id,
                              organizationSettings: {
                                isAdminReviewed: true,
                              },
                            });
                          }}
                        >
                          <CheckIcon />
                          {t("review")}
                        </MenuItem>
                      )}
                      {!org.organizationSettings?.isOrganizationConfigured && (
                        <MenuItem
                          onClick={() => {
                            updateMutation.mutate({
                              id: org.id,
                              organizationSettings: {
                                isOrganizationConfigured: true,
                              },
                            });
                          }}
                        >
                          <CheckCheckIcon />
                          {t("mark_dns_configured")}
                        </MenuItem>
                      )}
                      <MenuItem
                        render={
                          <a
                            href={`/settings/admin/organizations/${org.id}/edit`}
                          />
                        }
                      >
                        <PencilIcon />
                        {t("edit")}
                      </MenuItem>
                      {!org.slug && (
                        <MenuItem onClick={() => publishOrg(org)}>
                          <BookOpenCheckIcon />
                          {t("publish")}
                        </MenuItem>
                      )}
                      <MenuItem
                        onClick={() => {
                          updateMutation.mutate({
                            id: org.id,
                            organizationSettings: {
                              isAdminAPIEnabled:
                                !org.organizationSettings?.isAdminAPIEnabled,
                            },
                          });
                        }}
                      >
                        <TerminalIcon />
                        {org.organizationSettings?.isAdminAPIEnabled
                          ? t("revoke_admin_api")
                          : t("grant_admin_api")}
                      </MenuItem>
                      {org.organizationBilling && (
                        <>
                          <MenuSeparator />
                          <MenuSub>
                            <MenuSubTrigger>
                              <CreditCardIcon />
                              Plan
                            </MenuSubTrigger>
                            <MenuSubPopup>
                              <MenuRadioGroup
                                value={org.organizationBilling.planName}
                                onValueChange={(value) => {
                                  updateMutation.mutate({
                                    id: org.id,
                                    billingPlan: value as
                                      | "ORGANIZATION"
                                      | "ENTERPRISE",
                                  });
                                }}
                              >
                                <MenuRadioItem value="ORGANIZATION">
                                  Organization
                                </MenuRadioItem>
                                <MenuRadioItem value="ENTERPRISE">
                                  Enterprise
                                </MenuRadioItem>
                              </MenuRadioGroup>
                            </MenuSubPopup>
                          </MenuSub>
                        </>
                      )}
                      <MenuSeparator />
                      <MenuItem
                        variant="destructive"
                        onClick={() => setOrgToDelete(org)}
                      >
                        <TrashIcon />
                        {t("delete")}
                      </MenuItem>
                    </MenuPopup>
                  </Menu>
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
    <Dialog
      name="delete-user"
      open={!!org.id}
      onOpenChange={(open) => (open ? () => {} : onClose())}
    >
      <ConfirmationDialogContent
        title={t("admin_delete_organization_title", {
          organizationName: org.name,
        })}
        confirmBtnText={t("delete")}
        cancelBtnText={t("cancel")}
        variety="danger"
        onConfirm={onConfirm}
      >
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

async function invalidateQueries(
  utils: ReturnType<typeof trpc.useUtils>,
  data: { orgId: number }
) {
  await utils.viewer.organizations.adminGetAll.invalidate();
  await utils.viewer.organizations.adminGet.invalidate({
    id: data.orgId,
  });
  // Due to some super weird reason, just invalidate doesn't work, so do refetch as well.
  await utils.viewer.organizations.adminGet.refetch({
    id: data.orgId,
  });
}
