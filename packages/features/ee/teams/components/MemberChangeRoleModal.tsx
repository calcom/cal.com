import type { SyntheticEvent } from "react";
import { useMemo, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Select } from "@calcom/ui/components/form";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";

type MembershipRoleOption = {
  label: string;
  value: MembershipRole;
};

export const updateRoleInCache = ({
  utils,
  teamId,
  searchTerm,
  role,
  memberId,
}: {
  utils: ReturnType<typeof trpc.useUtils>;
  teamId: number;
  searchTerm: string | undefined;
  role: MembershipRole;
  memberId: number;
}) => {
  utils.viewer.teams.listMembers.setInfiniteData(
    {
      limit: 10,
      teamId,
      searchTerm,
    },
    (data) => {
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
          members: page.members.map((member) => ({
            ...member,
            role: member.id === memberId ? role : member.role,
          })),
        })),
      };
    }
  );
};

export default function MemberChangeRoleModal(props: {
  isOpen: boolean;
  currentMember: MembershipRole;
  memberId: number;
  teamId: number;
  initialRole: MembershipRole;
  onExit: () => void;
  searchTerm?: string;
}) {
  const { t } = useLocale();

  const options = useMemo(() => {
    return [
      {
        label: t("member"),
        value: MembershipRole.MEMBER,
      },
      {
        label: t("admin"),
        value: MembershipRole.ADMIN,
      },
      {
        label: t("owner"),
        value: MembershipRole.OWNER,
      },
    ].filter(({ value }) => value !== MembershipRole.OWNER || props.currentMember === MembershipRole.OWNER);
  }, [t, props.currentMember]);

  const [role, setRole] = useState<MembershipRoleOption>(
    options.find((option) => option.value === props.initialRole) || {
      label: t("member"),
      value: MembershipRole.MEMBER,
    }
  );
  const [errorMessage, setErrorMessage] = useState("");
  const utils = trpc.useUtils();

  const changeRoleMutation = trpc.viewer.teams.changeMemberRole.useMutation({
    onMutate: async ({ teamId, memberId, role }) => {
      await utils.viewer.teams.listMembers.cancel();
      const previousValue = utils.viewer.teams.listMembers.getInfiniteData({
        limit: 10,
        teamId,
        searchTerm: props.searchTerm,
      });

      if (previousValue) {
        updateRoleInCache({ utils, teamId, memberId, role, searchTerm: props.searchTerm });
      }

      return { previousValue };
    },
    async onSuccess() {
      await utils.viewer.teams.get.invalidate();
      await utils.viewer.organizations.listMembers.invalidate();

      props.onExit();
    },
    async onError(err) {
      setErrorMessage(err.message);
    },
  });

  function changeRole(e: SyntheticEvent) {
    e.preventDefault();

    changeRoleMutation.mutate({
      teamId: props.teamId,
      memberId: props.memberId,
      role: role.value,
    });
  }
  return (
    <Dialog open={props.isOpen} onOpenChange={props.onExit}>
      <DialogContent type="creation">
        <>
          <div className="mb-4 sm:flex sm:items-start">
            <div className="text-center sm:text-left">
              <h3
                className="text-emphasis !font-cal text-semibold leading-20 text-xl font-medium"
                id="modal-title">
                {t("change_member_role")}
              </h3>
            </div>
          </div>
          <form onSubmit={changeRole}>
            <div className="mb-4">
              <label className="text-default mb-2 block text-sm font-medium tracking-wide" htmlFor="role">
                {t("role")}
              </label>
              {/*<option value="OWNER">{t("owner")}</option> - needs dialog to confirm change of ownership */}
              <Select
                isSearchable={false}
                options={options}
                value={role}
                onChange={(option) => option && setRole(option)}
                id="role"
                className="border-default mt-1 block w-full rounded-md text-sm"
              />
            </div>
            {errorMessage && (
              <p className="text-sm text-red-700">
                <span className="font-bold">Error: </span>
                {errorMessage}
              </p>
            )}
            <DialogFooter className="mt-12">
              <Button type="button" color="secondary" onClick={props.onExit}>
                {t("cancel")}
              </Button>
              <Button type="submit" color="primary" className="me-2 ms-2">
                {t("save")}
              </Button>
            </DialogFooter>
          </form>
        </>
      </DialogContent>
    </Dialog>
  );
}
