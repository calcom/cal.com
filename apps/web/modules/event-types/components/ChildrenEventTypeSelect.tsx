import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useState } from "react";
import type { Props } from "react-select";
import ReactSelectCreatable from "react-select/creatable";

import { getBookerBaseUrlSync } from "@calcom/features/ee/organizations/lib/getBookerBaseUrlSync";
import type { ChildrenEventType } from "@calcom/features/eventtypes/lib/childrenEventType";
import type { SelectClassNames } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole, CreationSource } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";
import classNames from "@calcom/ui/classNames";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { ButtonGroup } from "@calcom/ui/components/buttonGroup";
import { Switch } from "@calcom/ui/components/form";
import { Tooltip } from "@calcom/ui/components/tooltip";
import { getReactSelectProps } from "@calcom/ui/components/form/select/selectTheme";

import { parseCommaSeparatedEmails, looksLikeEmail } from "../lib/emailUtils";

export type { ChildrenEventType } from "@calcom/features/eventtypes/lib/childrenEventType";

export type ChildrenEventTypeSelectCustomClassNames = {
  assignToSelect?: SelectClassNames;
  selectedChildrenList?: {
    container?: string;
    listItem?: {
      container?: string;
      avatar?: string;
      name?: string;
      ownerBadge?: string;
      memberBadge?: string;
      hiddenBadge?: string;
      badgeContainer?: string;
      eventLink?: string;
      showOnProfileTooltip?: string;
      previewEventTypeTooltip?: string;
      previewEventTypeButton?: string;
      deleteEventTypeTooltip?: string;
      deleteEventTypeButton?: string;
    };
  };
};

// TODO: This isnt just a select... rename this component in the future took me ages to find the component i was looking for
export const ChildrenEventTypeSelect = ({
  options = [],
  value = [],
  customClassNames,
  teamId,
  ...props
}: Omit<Props<ChildrenEventType, true>, "value" | "onChange"> & {
  value?: ChildrenEventType[];
  onChange: (value: readonly ChildrenEventType[]) => void;
  teamId?: number;
  customClassNames?: ChildrenEventTypeSelectCustomClassNames;
}) => {
  const { t } = useLocale();
  const [animationRef] = useAutoAnimate<HTMLUListElement>();
  const [isInviting, setIsInviting] = useState(false);

  const utils = trpc.useUtils();
  const inviteMemberMutation = trpc.viewer.teams.inviteMember.useMutation({
    onSuccess: () => {
      showToast("Invitation sent successfully", "success");
      // Refetch team members to update the list
      utils.viewer.teams.get.invalidate();
    },
    onError: (error) => {
      showToast(error.message || "Something went wrong", "error");
    },
    onSettled: () => {
      setIsInviting(false);
    },
  });

  // Handle creating options from email input
  const handleCreateOption = async (inputValue: string) => {
    if (!teamId) {
      showToast("Team ID is required", "error");
      return;
    }

    // Parse comma-separated emails
    const emails = parseCommaSeparatedEmails(inputValue);

    if (emails.length === 0) {
      showToast("Invalid email address", "error");
      return;
    }

    setIsInviting(true);

    try {
      // Invite each email
      await inviteMemberMutation.mutateAsync({
        teamId,
        usernameOrEmail: emails,
        role: MembershipRole.MEMBER,
        language: "en",
        creationSource: CreationSource.ASSIGNMENT,
      });
    } catch (error) {
      console.error("Failed to invite members:", error);
    }
  };

  // Custom filter to allow email-like inputs
  const filterOption = (option: any, inputValue: string) => {
    if (!inputValue) return true;

    // Allow the option if it matches or if the input looks like an email
    const matchesLabel = option.label?.toLowerCase().includes(inputValue.toLowerCase());
    const matchesEmail = option.data?.owner?.email?.toLowerCase().includes(inputValue.toLowerCase());

    return matchesLabel || matchesEmail || looksLikeEmail(inputValue);
  };

  const reactSelectProps = getReactSelectProps<ChildrenEventType, true>({
    components: {},
    menuPlacement: "auto",
  });

  return (
    <>
      <ReactSelectCreatable
        {...reactSelectProps}
        name={props.name}
        placeholder="Select members or enter email to invite"
        options={options}
        className={customClassNames?.assignToSelect?.select}
        value={value}
        isMulti
        isDisabled={isInviting}
        isLoading={isInviting}
        onCreateOption={handleCreateOption}
        filterOption={filterOption}
        formatCreateLabel={(inputValue: string) => {
          const emails = parseCommaSeparatedEmails(inputValue);
          if (emails.length > 1) {
            return `Invite ${emails.length} emails`;
          }
          return `Invite: ${inputValue}`;
        }}
        onChange={(newValue) => {
          if (props.onChange) {
            props.onChange(newValue as readonly ChildrenEventType[]);
          }
        }}
      />
      {/* This class name conditional looks a bit odd but it allows a seamless transition when using autoanimate
       - Slides down from the top instead of just teleporting in from nowhere*/}
      <ul
        className={classNames(
          "border-subtle divide-subtle mt-3 divide-y rounded-md",
          value.length >= 1 && "border",
          customClassNames?.selectedChildrenList?.container
        )}
        ref={animationRef}>
        {value.map((children, index) => (
          <li key={index}>
            <div
              className={classNames(
                "flex flex-row items-center gap-3 p-3",
                customClassNames?.selectedChildrenList?.listItem?.container
              )}>
              <Avatar
                size="mdLg"
                className={classNames(
                  "overflow-visible",
                  customClassNames?.selectedChildrenList?.listItem?.avatar
                )}
                imageSrc={children.owner.avatar}
                alt={children.owner.name || children.owner.email || ""}
              />
              <div className="flex w-full flex-row justify-between">
                <div className="flex flex-col">
                  <span
                    className={classNames(
                      "text text-sm font-semibold leading-none",
                      customClassNames?.selectedChildrenList?.listItem?.name
                    )}>
                    {children.owner.name || children.owner.email}
                    <div
                      className={classNames(
                        "flex flex-row gap-1",
                        customClassNames?.selectedChildrenList?.listItem?.badgeContainer
                      )}>
                      {children.owner.membership === MembershipRole.OWNER ? (
                        <Badge
                          variant="gray"
                          className={customClassNames?.selectedChildrenList?.listItem?.ownerBadge}>
                          {t("owner")}
                        </Badge>
                      ) : (
                        <Badge
                          variant="gray"
                          className={customClassNames?.selectedChildrenList?.listItem?.memberBadge}>
                          {t("member")}
                        </Badge>
                      )}
                      {children.hidden && (
                        <Badge
                          variant="gray"
                          className={customClassNames?.selectedChildrenList?.listItem?.hiddenBadge}>
                          {t("hidden")}
                        </Badge>
                      )}
                    </div>
                  </span>
                  {children.owner.username && (
                    <small
                      className={classNames(
                        "text-subtle font-normal leading-normal",
                        customClassNames?.selectedChildrenList?.listItem?.eventLink
                      )}>
                      {`/${children.owner.username}/${children.slug}`}
                    </small>
                  )}
                </div>
                <div className={classNames("flex flex-row items-center gap-2")}>
                  <Tooltip
                    className={customClassNames?.selectedChildrenList?.listItem?.showOnProfileTooltip}
                    content={t("show_eventtype_on_profile")}>
                    <div className="self-center rounded-md p-2">
                      <Switch
                        name="Hidden"
                        checked={!children.hidden}
                        onCheckedChange={(checked) => {
                          const newData = value.map((item) =>
                            item.owner.id === children.owner.id ? { ...item, hidden: !checked } : item
                          );
                          props.onChange(newData);
                        }}
                      />
                    </div>
                  </Tooltip>
                  <ButtonGroup combined>
                    {children.created && children.owner.username && (
                      <Tooltip
                        className={customClassNames?.selectedChildrenList?.listItem?.previewEventTypeTooltip}
                        content={t("preview")}>
                        <Button
                          data-testid="preview-button"
                          color="secondary"
                          target="_blank"
                          variant="icon"
                          className={customClassNames?.selectedChildrenList?.listItem?.previewEventTypeButton}
                          href={`${getBookerBaseUrlSync(
                            children.owner.profile?.organization?.slug ?? null
                          )}/${children.owner?.username}/${children.slug}`}
                          StartIcon="external-link"
                        />
                      </Tooltip>
                    )}
                    <Tooltip
                      className={customClassNames?.selectedChildrenList?.listItem?.deleteEventTypeTooltip}
                      content={t("delete")}>
                      <Button
                        color="secondary"
                        target="_blank"
                        variant="icon"
                        className={customClassNames?.selectedChildrenList?.listItem?.deleteEventTypeButton}
                        onClick={() =>
                          props.onChange(value.filter((item) => item.owner.id !== children.owner.id))
                        }
                        StartIcon="x"
                      />
                    </Tooltip>
                  </ButtonGroup>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
};

export default ChildrenEventTypeSelect;
