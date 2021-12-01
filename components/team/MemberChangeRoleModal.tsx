import { MembershipRole } from "@prisma/client";
import { useState } from "react";
import React, { SyntheticEvent } from "react";

import { useLocale } from "@lib/hooks/useLocale";
import { trpc } from "@lib/trpc";

import Button from "@components/ui/Button";

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
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true">
      <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 z-0 transition-opacity bg-gray-500 bg-opacity-75"
          aria-hidden="true"></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block px-4 pt-5 pb-4 text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="mb-4 sm:flex sm:items-start">
            <div className="text-center sm:text-left">
              <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                {t("change_member_role")}
              </h3>
            </div>
          </div>
          <form onSubmit={changeRole}>
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium tracking-wide text-gray-700" htmlFor="role">
                {t("role")}
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as MembershipRole)}
                id="role"
                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-brand sm:text-sm">
                <option value="MEMBER">{t("member")}</option>
                <option value="ADMIN">{t("admin")}</option>
                <option value="OWNER">{t("owner")}</option>
              </select>
            </div>

            {errorMessage && (
              <p className="text-sm text-red-700">
                <span className="font-bold">Error: </span>
                {errorMessage}
              </p>
            )}
            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
              <Button type="submit" color="primary" className="ml-2">
                {t("save")}
              </Button>
              <Button type="button" color="secondary" onClick={props.onExit}>
                {t("cancel")}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
