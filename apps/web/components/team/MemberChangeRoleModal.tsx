import { MembershipRole } from "@prisma/client";
import { useState } from "react";
import React, { SyntheticEvent, useEffect } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import Button from "@calcom/ui/Button";

import { trpc } from "@lib/trpc";

import ModalContainer from "@components/ui/ModalContainer";
import Select from "@components/ui/form/Select";

type MembershipRoleOption = {
  value: MembershipRole;
  label?: string;
};

const options: MembershipRoleOption[] = [{ value: "MEMBER" }, { value: "ADMIN" }, { value: "OWNER" }];

export default function MemberChangeRoleModal(props: {
  isOpen: boolean;
  currentMember: MembershipRole;
  memberId: number;
  teamId: number;
  initialRole: MembershipRole;
  onExit: () => void;
}) {
  useEffect(() => {
    options.forEach((option, i) => {
      options[i].label = t(option.value.toLowerCase());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [role, setRole] = useState(
    options.find((option) => option.value === props.initialRole || MembershipRole.MEMBER)!
  );
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
      role: role.value,
    });
  }
  return (
    <ModalContainer isOpen={props.isOpen} onExit={props.onExit}>
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
              options={props.currentMember !== MembershipRole.OWNER ? options.slice(0, 2) : options}
              value={role}
              onChange={(option) => option && setRole(option)}
              id="role"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
            />
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
