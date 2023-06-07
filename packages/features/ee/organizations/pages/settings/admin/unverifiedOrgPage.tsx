import LicenseRequired from "ee/common/components/LicenseRequired";
import { extractDomainFromWebsiteUrl } from "ee/organizations/lib/utils";
import { useState } from "react";

import NoSSR from "@calcom/core/components/NoSSR";
import { trpc } from "@calcom/trpc/react";
import { Button, Meta } from "@calcom/ui";
import { ConfirmationDialogContent, Dialog, DropdownActions, showToast, Table } from "@calcom/ui";
import { Building } from "@calcom/ui/components/icon";

import { getLayout } from "../../../../../settings/layouts/SettingsLayout";

const { Body, Cell, ColumnTitle, Header, Row } = Table;

function UnverifiedOrgTable() {
  const utils = trpc.useContext();
  const [data] = trpc.viewer.organizations.adminGetUnverified.useSuspenseQuery();
  const mutation = trpc.viewer.users.delete.useMutation({
    onSuccess: async () => {
      showToast("User has been deleted", "success");
      await utils.viewer.users.list.invalidate();
    },
    onError: (err) => {
      console.error(err.message);
      showToast("There has been an error deleting this user.", "error");
    },
    onSettled: () => {
      setUserToDelete(null);
    },
  });
  const [userToDelete, setUserToDelete] = useState<number | null>(null);

  return (
    <div>
      <Table>
        <Header>
          <ColumnTitle widthClassNames="w-auto">Org</ColumnTitle>
          <ColumnTitle widthClassNames="w-auto">
            <span className="sr-only">Edit</span>
          </ColumnTitle>
        </Header>

        <Body>
          {data.map((org) => (
            <Row key={org.id}>
              <Cell widthClassNames="w-auto">
                <div className="min-h-10 pl-12">
                  <div className="text-subtle ml-4 font-medium">
                    <span className="text-default">
                      {org.slug}.{extractDomainFromWebsiteUrl}
                    </span>
                    <br />
                    <span className="break-all">{org.members[0].user.email}</span>
                  </div>
                </div>
              </Cell>

              <Cell widthClassNames="w-auto">
                <div className="flex w-full justify-end">
                  <DropdownActions
                    actions={[
                      {
                        id: "accept",
                        label: "Accept",
                        icon: Building,
                      },
                      // {
                      //   id: "reset-password",
                      //   label: "Reset Password",
                      //   href: `/deployments/${router.query.deploymentId}/users/${user.id}/edit`,
                      //   icon: FiLock,
                      // },
                      // {
                      //   id: "delete",
                      //   label: "Delete",
                      //   color: "destructive",
                      //   onClick: () => setUserToDelete(user.id),
                      //   icon: Trash,
                      // },
                    ]}
                  />
                </div>
              </Cell>
            </Row>
          ))}
        </Body>
      </Table>
      <DeleteUserDialog
        user={userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={() => {
          if (!userToDelete) return;
          mutation.mutate({ userId: userToDelete });
        }}
      />
    </div>
  );
}

const DeleteUserDialog = ({
  user,
  onConfirm,
  onClose,
}: {
  user: number | null;
  onConfirm: () => void;
  onClose: () => void;
}) => {
  return (
    // eslint-disable-next-line @typescript-eslint/no-empty-function -- noop
    <Dialog name="delete-user" open={!!user} onOpenChange={(open) => (open ? () => {} : onClose())}>
      <ConfirmationDialogContent
        title="Delete User"
        confirmBtnText="Delete"
        cancelBtnText="Cancel"
        variety="danger"
        onConfirm={onConfirm}>
        <p>Are you sure you want to delete this user?</p>
      </ConfirmationDialogContent>
    </Dialog>
  );
};

const UnverifiedOrgList = () => {
  return (
    <LicenseRequired>
      <Meta
        title="Users"
        description="A list of all the users in your account including their name, title, email and role."
        CTA={
          <div className="mt-4 space-x-5 sm:mt-0 sm:ml-16 sm:flex-none">
            {/* TODO: Add import users functionality */}
            {/* <Button disabled>Import users</Button> */}
            <Button href="/settings/admin/users/add">Add user</Button>
          </div>
        }
      />
      <NoSSR>
        <UnverifiedOrgTable />
      </NoSSR>
    </LicenseRequired>
  );
};

UnverifiedOrgList.getLayout = getLayout;

export default UnverifiedOrgList;
