import { MembershipRole } from "@prisma/client";
import { useState } from "react";
import React, { SyntheticEvent } from "react";

import { useLocale } from "@lib/hooks/useLocale";
import { trpc } from "@lib/trpc";

import Button from "@components/ui/Button";
import ModalContainer from "@components/ui/ModalContainer";

export default function MemberChangeRoleModal(props: {
  memberId: number;
  teamId: number;
  initialRole: MembershipRole;
  onExit: () => void;
}) {
  const [role, setRole] = useState(props.initialRole || MembershipRole.MEMBER);
  const [errorMessage, setErrorMessage] = useState("");
  const { t } = useLocale();
  const utils = trpc.useContext();

  const changeRoleMutation = trpc.useMutation("viewer.teams.changeMemberRole", {
    async onSuccess() {
      await utils.invalidateQueries(["viewer.teams.get"]);
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
      role,
    });
  }

  return (
    <ModalContainer>
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
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as MembershipRole)}
              id="role"
              className="focus:border-brand mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-black sm:text-sm">
              <option value="MEMBER">{t("member")}</option>
              <option value="ADMIN">{t("admin")}</option>
              {/*<option value="OWNER">{t("owner")}</option> - needs dialog to confirm change of ownership */}
            </select>
          </div>

          {errorMessage && (
            <p className="text-sm text-red-700">
              <span className="font-bold">Error: </span>
              {errorMessage}
            </p>
          )}
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <Button type="submit" color="primary" className="ltr:ml-2 rtl:mr-2">
              {t("save")}
            </Button>
            <Button type="button" color="secondary" onClick={props.onExit}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      </>
    </ModalContainer>
  );
}
