import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useState } from "react";
import type { Props } from "react-select";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc";
import { isEmail } from "@calcom/trpc/server/routers/viewer/teams/util";
import { Avatar, Select, showToast } from "@calcom/ui";
import { SkeletonContainer, SkeletonText } from "@calcom/ui";
import { X } from "@calcom/ui/components/icon";

export type CheckedSelectOption = {
  avatar: string;
  label: string;
  value: string;
  disabled?: boolean;
};

function SkeletonLoader() {
  return (
    <SkeletonContainer>
      <ul className="border-subtle bg-default divide-subtle divide-y rounded-md border sm:mx-0 sm:overflow-hidden">
        <SkeletonItem />
        <SkeletonItem />
      </ul>
    </SkeletonContainer>
  );
}

function SkeletonItem() {
  return (
    <li className="border-subtle group mb-4 flex h-[90px] w-full items-center justify-between rounded-md border px-4 py-4 sm:px-6">
      <div className="mt-0 flex flex-shrink-0 sm:ml-5">
        <div className="flex justify-between space-x-2 rtl:space-x-reverse">
          <SkeletonText className="h-8 w-8 sm:w-16" />
          <SkeletonText className="h-8 w-8 sm:w-16" />
        </div>
      </div>
    </li>
  );
}

export const CheckedTeamSelect = ({
  options = [],
  value = [],
  teamId,
  isOrg,
  ...props
}: Omit<Props<CheckedSelectOption, true>, "value" | "onChange"> & {
  value?: readonly CheckedSelectOption[];
  onChange: (value: readonly CheckedSelectOption[]) => void;
  teamId: number | undefined;
  isOrg: boolean;
}) => {
  const { t, i18n } = useLocale();
  const utils = trpc.useContext();

  const [animationRef] = useAutoAnimate<HTMLUListElement>();
  const [emails, setEmails] = useState<string | string[]>("");
  const [error, setError] = useState<string | null>(null);
  const isValidEmail = () => {
    if (Array.isArray(emails) && emails.some((email) => !isEmail(email))) {
      return false;
    }
    if (typeof emails === "string" && !isEmail(emails)) {
      return false;
    }
    return true;
  };

  const inviteMemberMutation = trpc.viewer.teams.inviteMember.useMutation({
    async onSuccess(data) {
      await utils.viewer.teams.list.invalidate();
      await utils.viewer.eventTypes.get.invalidate();
      if (Array.isArray(data.usernameOrEmail)) {
        showToast(
          t("email_invite_team_bulk", {
            userCount: data.usernameOrEmail.length,
          }),
          "success"
        );
      } else {
        showToast(
          t("email_invite_team", {
            email: data.usernameOrEmail,
          }),
          "success"
        );
      }
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });
  if (inviteMemberMutation.isPending) return <SkeletonLoader />;

  return (
    <>
      <Select
        name={props.name}
        placeholder={props.placeholder || t("select")}
        isSearchable={true}
        options={options}
        value={value}
        onBlur={() => {
          setError(null);
        }}
        onInputChange={(e) => {
          const targetValues = e.split(/[\n,]/);
          const emails =
            targetValues.length === 1
              ? targetValues[0].trim().toLocaleLowerCase()
              : targetValues.map((email) => email.trim().toLocaleLowerCase());
          setEmails(emails);
        }}
        onKeyDown={(e) => {
          if (e.keyCode === 13 && teamId) {
            e.preventDefault();
            if (inviteMemberMutation.isPending) return;
            if (!isValidEmail()) {
              setError(t("enter_valid_email"));
              return;
            }
            inviteMemberMutation.mutate({
              teamId,
              language: i18n.language,
              role: MembershipRole.MEMBER,
              usernameOrEmail: emails,
              isOrg,
            });
          }
        }}
        isMulti
        {...props}
      />
      {/* This class name conditional looks a bit odd but it allows a seemless transition when using autoanimate
       - Slides down from the top instead of just teleporting in from nowhere*/}
      <ul
        className={classNames("mb-1 mt-3 rounded-md", value.length >= 1 && "border-subtle border")}
        ref={animationRef}>
        {error ? (
          <span className="text-sm text-red-800">{error}</span>
        ) : (
          value.map((option, index) => (
            <li
              key={option.value}
              className={`flex px-3 py-2 ${index === value.length - 1 ? "" : "border-subtle border-b"}`}>
              <Avatar size="sm" imageSrc={option.avatar} alt={option.label} />
              <p className="text-emphasis my-auto ms-3 text-sm">{option.label}</p>
              <X
                onClick={() => props.onChange(value.filter((item) => item.value !== option.value))}
                className="my-auto ml-auto h-4 w-4"
              />
            </li>
          ))
        )}
      </ul>
    </>
  );
};

export default CheckedTeamSelect;
