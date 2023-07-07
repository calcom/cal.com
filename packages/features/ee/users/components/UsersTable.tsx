import { useState, useRef, useMemo, useCallback, useEffect } from "react";

import { trpc } from "@calcom/trpc/react";
import { Badge, ConfirmationDialogContent, Dialog, DropdownActions, showToast, Table } from "@calcom/ui";
import { Edit, Trash } from "@calcom/ui/components/icon";

import { withLicenseRequired } from "../../common/components/LicenseRequired";

const { Cell, ColumnTitle, Header, Row } = Table;

const FETCH_LIMIT = 25;

function UsersTableBare() {
  const tableContainerRef = useRef<HTMLTableSectionElement>(null);
  const utils = trpc.useContext();

  const mutation = trpc.viewer.users.delete.useMutation({
    onSuccess: async () => {
      showToast("User has been deleted", "success");
      // Lets not invalidated the whole cache, just remove the user from the cache.
      // usefull cause in prod this will be fetching 100k+ users
      utils.viewer.admin.listPaginated.setInfiniteData({ limit: FETCH_LIMIT }, (data) => {
        if (!data) {
          return {
            pages: [],
            pageParams: [],
          };
        }
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            rows: page.rows.filter((row) => row.id !== userToDelete),
          })),
        };
      });
    },
    onError: (err) => {
      console.error(err.message);
      showToast("There has been an error deleting this user.", "error");
    },
    onSettled: () => {
      setUserToDelete(null);
    },
  });

  const { data, fetchNextPage, isFetching } = trpc.viewer.admin.listPaginated.useInfiniteQuery(
    {
      limit: FETCH_LIMIT,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    }
  );

  //we must flatten the array of arrays from the useInfiniteQuery hook
  const flatData = useMemo(() => data?.pages?.flatMap((page) => page.rows) ?? [], [data]);
  const totalDBRowCount = data?.pages?.[0]?.meta?.totalRowCount ?? 0;
  const totalFetched = flatData.length;

  //called on scroll and possibly on mount to fetch more data as the user scrolls and reaches bottom of table
  const fetchMoreOnBottomReached = useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      if (containerRefElement) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
        //once the user has scrolled within 300px of the bottom of the table, fetch more data if there is any
        if (scrollHeight - scrollTop - clientHeight < 300 && !isFetching && totalFetched < totalDBRowCount) {
          fetchNextPage();
        }
      }
    },
    [fetchNextPage, isFetching, totalFetched, totalDBRowCount]
  );

  useEffect(() => {
    fetchMoreOnBottomReached(tableContainerRef.current);
  }, [fetchMoreOnBottomReached]);

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

        <tbody
          ref={tableContainerRef}
          onScroll={() => fetchMoreOnBottomReached()}
          // We can sort the style out for mobile when this is needed
          // Future user mangament for org/teams implements shadcns table that has good mobile support
          className="divide-subtle h-[calc(100vh-300px)] divide-y overflow-y-scroll rounded-md">
          {flatData.map((user) => (
            <Row key={user.email}>
              <Cell widthClassNames="w-auto">
                {/*
                  Using flexbox in a table will mess with the overflow, that's why I used position absolute
                  to position the image.
                */}
                <div className="min-h-10 relative pl-12">
                  <img
                    className="absolute left-0 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full"
                    src={user.avatar || ""}
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
        </tbody>
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
