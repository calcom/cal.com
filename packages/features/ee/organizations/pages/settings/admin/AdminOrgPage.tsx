"use client";

import NoSSR from "@calcom/core/components/NoSSR";
import LicenseRequired from "@calcom/ee/common/components/LicenseRequired";
import { extractDomainFromWebsiteUrl } from "@calcom/ee/organizations/lib/utils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Meta, DropdownActions, showToast, Table, Badge } from "@calcom/ui";
import { X, Check, CheckCheck } from "@calcom/ui/components/icon";

import { getLayout } from "../../../../../settings/layouts/SettingsLayout";

const { Body, Cell, ColumnTitle, Header, Row } = Table;

function AdminOrgTable() {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const [data] = trpc.viewer.organizations.adminGetAll.useSuspenseQuery();
  const verifyMutation = trpc.viewer.organizations.adminVerify.useMutation({
    onSuccess: async () => {
      showToast(t("org_has_been_processed"), "success");
      await utils.viewer.organizations.adminGetAll.invalidate();
    },
    onError: (err) => {
      console.error(err.message);
      showToast(t("org_error_processing"), "error");
    },
  });
  const updateMutation = trpc.viewer.organizations.update.useMutation({
    onSuccess: async () => {
      showToast(t("org_has_been_processed"), "success");
      await utils.viewer.organizations.adminGetAll.invalidate();
    },
    onError: (err) => {
      console.error(err.message);
      showToast(t("org_error_processing"), "error");
    },
  });

  return (
    <div>
      <Table>
        <Header>
          <ColumnTitle widthClassNames="w-auto">{t("organization")}</ColumnTitle>
          <ColumnTitle widthClassNames="w-auto">{t("owner")}</ColumnTitle>
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
                    {org.slug}.{extractDomainFromWebsiteUrl}
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
                  {!org.metadata?.isOrganizationVerified && <Badge variant="blue">{t("unverified")}</Badge>}
                  {!org.metadata?.isOrganizationConfigured && <Badge variant="red">{t("dns_missing")}</Badge>}
                </div>
              </Cell>
              <Cell widthClassNames="w-auto">
                <div className="flex w-full justify-end">
                  {(!org.metadata?.isOrganizationVerified || !org.metadata?.isOrganizationConfigured) && (
                    <DropdownActions
                      actions={[
                        ...(!org.metadata?.isOrganizationVerified
                          ? [
                              {
                                id: "accept",
                                label: t("accept"),
                                onClick: () => {
                                  verifyMutation.mutate({
                                    orgId: org.id,
                                    status: "ACCEPT",
                                  });
                                },
                                icon: Check,
                              },
                              {
                                id: "reject",
                                label: t("reject"),
                                onClick: () => {
                                  verifyMutation.mutate({
                                    orgId: org.id,
                                    status: "DENY",
                                  });
                                },
                                icon: X,
                              },
                            ]
                          : []),
                        ...(!org.metadata?.isOrganizationConfigured
                          ? [
                              {
                                id: "dns",
                                label: t("mark_dns_configured"),
                                onClick: () => {
                                  updateMutation.mutate({
                                    orgId: org.id,
                                    metadata: {
                                      isOrganizationConfigured: true,
                                    },
                                  });
                                },
                                icon: CheckCheck,
                              },
                            ]
                          : []),
                      ]}
                    />
                  )}
                </div>
              </Cell>
            </Row>
          ))}
        </Body>
      </Table>
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
