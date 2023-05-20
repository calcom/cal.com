import { useState } from "react";

import { trpc } from "@calcom/trpc/react";
import { Badge, ConfirmationDialogContent, Dialog, DropdownActions, showToast, Table } from "@calcom/ui";
import { Edit, Trash } from "@calcom/ui/components/icon";

import { withLicenseRequired } from "../../common/components/LicenseRequired";

const { Body, Cell, ColumnTitle, Header, Row } = Table;

function UsersTableBare() {
  const utils = trpc.useContext();
  const [data] = trpc.viewer.users.list.useSuspenseQuery();
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
          <ColumnTitle widthClassNames="w-auto">User</ColumnTitle>
          <ColumnTitle>Timezone</ColumnTitle>
          <ColumnTitle>Role</ColumnTitle>
          <ColumnTitle widthClassNames="w-auto">
            <span className="sr-only">Edit</span>
          </ColumnTitle>
        </Header>

        <Body>
          {data.map((user) => (
            <Row key={user.email}>
              <Cell widthClassNames="w-auto">
                {/*
                  Using flexbox in a table will mess with the overflow, that's why I used position absolute
                  to position the image.
                */}
                <div className="min-h-10 relative pl-12">
                  <img
                    className="absolute left-0 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full"
                    src={user.avatar}
                    alt={`Avatar of ${user.name}`}
                  />

                  <div className="text-subtle ml-4 font-medium">
                    <span className="text-default">{user.name}</span>
                    <span className="ml-3">/{user.username}</span>
                    <br />
                    <span className="break-all">{user.email}</span>
                  </div>
                </div>
              </Cell>
              <Cell>{user.timeZone}</Cell>
              <Cell>
                <Badge className="capitalize" variant={user.role === "ADMIN" ? "red" : "gray"}>
                  {user.role.toLowerCase()}
                </Badge>
              </Cell>
              <Cell widthClassNames="w-auto">
                <div className="flex w-full justify-end">
                  <DropdownActions
                    actions={[
                      {
                        id: "edit",
                        label: "Edit",
                        href: `/settings/admin/users/${user.id}/edit`,
                        icon: Edit,
                      },
                      // {
                      //   id: "reset-password",
                      //   label: "Reset Password",
                      //   href: `/deployments/${router.query.deploymentId}/users/${user.id}/edit`,
                      //   icon: FiLock,
                      // },
                      {
                        id: "delete",
                        label: "Delete",
                        color: "destructive",
                        onClick: () => setUserToDelete(user.id),
                        icon: Trash,
                      },
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

export const UsersTable = withLicenseRequired(UsersTableBare);
