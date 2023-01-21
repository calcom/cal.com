import { MembershipRole } from "@prisma/client";
import { SyntheticEvent, useMemo, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, Dialog, DialogContent, Select } from "@calcom/ui";

type MembershipRoleOption = {
  label: string;
  value: MembershipRole;
};

export default function MemberChangeRoleModal(props: {
  isOpen: boolean;
  currentMember: MembershipRole;
  memberId: number;
  teamId: number;
  initialRole: MembershipRole;
  onExit: () => void;
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
  const utils = trpc.useContext();

  const changeRoleMutation = trpc.viewer.teams.changeMemberRole.useMutation({
    async onSuccess() {
      await utils.viewer.teams.get.invalidate();
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
      <DialogContent disableOverflow type="creation">
        <>
          <div className="mb-4 sm:flex sm:items-start">
            <div className="text-center sm:text-left">
              <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                {t("change_member_role")}
              </h3>
            </div>
          </div>
          <form onSubmit={changeRole}>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium tracking-wide text-gray-700" htmlFor="role">
                {t("role")}
              </label>
              {/*<option value="OWNER">{t("owner")}</option> - needs dialog to confirm change of ownership */}
              <Select
                isSearchable={false}
                options={options}
                value={role}
                onChange={(option) => option && setRole(option)}
                id="role"
                className="mt-1 block w-full rounded-md border-gray-300 text-sm"
              />
            </div>
            {errorMessage && (
              <p className="text-sm text-red-700">
                <span className="font-bold">Error: </span>
                {errorMessage}
              </p>
            )}
            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
              <Button type="submit" color="primary" className="ltr:ml-2 ltr:mr-2 rtl:ml-2">
                {t("save")}
              </Button>
              <Button type="button" color="secondary" onClick={props.onExit}>
                {t("cancel")}
              </Button>
            </div>
          </form>
        </>
      </DialogContent>
    </Dialog>
  );
}
