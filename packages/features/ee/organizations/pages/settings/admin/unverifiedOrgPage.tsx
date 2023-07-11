import NoSSR from "@calcom/core/components/NoSSR";
import LicenseRequired from "@calcom/ee/common/components/LicenseRequired";
import { extractDomainFromWebsiteUrl } from "@calcom/ee/organizations/lib/utils";
import { trpc } from "@calcom/trpc/react";
import { Meta } from "@calcom/ui";
import { DropdownActions, showToast, Table } from "@calcom/ui";
import { Check, X } from "@calcom/ui/components/icon";

import { getLayout } from "../../../../../settings/layouts/SettingsLayout";

const { Body, Cell, ColumnTitle, Header, Row } = Table;

function UnverifiedOrgTable() {
  const utils = trpc.useContext();
  const [data] = trpc.viewer.organizations.adminGetUnverified.useSuspenseQuery();
  const mutation = trpc.viewer.organizations.adminVerify.useMutation({
    onSuccess: async () => {
      showToast("Org has been processed", "success");
      await utils.viewer.organizations.adminGetUnverified.invalidate();
    },
    onError: (err) => {
      console.error(err.message);
      showToast("There has been an error processing this org.", "error");
    },
  });

  return (
    <div>
      <Table>
        <Header>
          <ColumnTitle widthClassNames="w-auto">Organization</ColumnTitle>
          <ColumnTitle widthClassNames="w-auto">Owner</ColumnTitle>
          <ColumnTitle widthClassNames="w-auto">
            <span className="sr-only">Edit</span>
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
                <span className="break-all">{org.members[0].user.email}</span>
              </Cell>

              <Cell widthClassNames="w-auto">
                <div className="flex w-full justify-end">
                  <DropdownActions
                    actions={[
                      {
                        id: "accept",
                        label: "Accept",
                        onClick: () => {
                          mutation.mutate({
                            orgId: org.id,
                            status: "ACCEPT",
                          });
                        },
                        icon: Check,
                      },
                      {
                        id: "reject",
                        label: "Reject",
                        onClick: () => {
                          mutation.mutate({
                            orgId: org.id,
                            status: "DENY",
                          });
                        },
                        icon: X,
                      },
                    ]}
                  />
                </div>
              </Cell>
            </Row>
          ))}
        </Body>
      </Table>
    </div>
  );
}

const UnverifiedOrgList = () => {
  return (
    <LicenseRequired>
      <Meta
        title="Organizations"
        description="A list of all organizations that need verification based on their email domain. Accepting an organization will allow all users with that email domain to sign up WITHOUT email verifciation."
      />
      <NoSSR>
        <UnverifiedOrgTable />
      </NoSSR>
    </LicenseRequired>
  );
};

UnverifiedOrgList.getLayout = getLayout;

export default UnverifiedOrgList;
