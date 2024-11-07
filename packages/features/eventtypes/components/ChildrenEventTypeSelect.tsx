import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { Props } from "react-select";

import type { SelectClassnames, SwitchClassnames } from "@calcom/features/eventtypes/lib/types";
import { classNames } from "@calcom/lib";
import { getBookerBaseUrlSync } from "@calcom/lib/getBookerUrl/client";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import type { UserProfile } from "@calcom/types/UserProfile";
import { Avatar, Badge, Button, ButtonGroup, Select, Switch, Tooltip } from "@calcom/ui";

export type ChildrenEventType = {
  value: string;
  label: string;
  created: boolean;
  owner: {
    avatar: string;
    id: number;
    email: string;
    name: string;
    username: string;
    membership: MembershipRole;
    eventTypeSlugs: string[];
    profile: UserProfile;
  };
  slug: string;
  hidden: boolean;
};

export type ChildrenEventTypeSelectCustomClassnames = {
  container?: string;
  assignToSelectClassnames?: SelectClassnames;
  selectedChildrenListClassnames?: {
    container?: string;
    listItemClassnames?: {
      container?: string;
      avatar?: string;
      name?: string;
      ownerBadge?: string;
      memberBadge?: string;
      hiddenBadge?: string;
      badgeContainer?: string;
      eventLink?: string;
      showEventTypeOnProfileTooltip?: string;
      showEventTypeOnProfileSwitchClassNames?: SwitchClassnames;
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
  customClassnames,
  ...props
}: Omit<Props<ChildrenEventType, true>, "value" | "onChange"> & {
  value?: ChildrenEventType[];
  onChange: (value: readonly ChildrenEventType[]) => void;
  customClassnames?: ChildrenEventTypeSelectCustomClassnames;
}) => {
  const { t } = useLocale();
  const [animationRef] = useAutoAnimate<HTMLUListElement>();

  return (
    <>
      <Select
        name={props.name}
        placeholder={t("select")}
        options={options}
        className={customClassnames?.assignToSelectClassnames?.select}
        innerClassNames={customClassnames?.assignToSelectClassnames?.innerClassNames}
        value={value}
        isMulti
        {...props}
      />
      {/* This class name conditional looks a bit odd but it allows a seemless transition when using autoanimate
       - Slides down from the top instead of just teleporting in from nowhere*/}
      <ul
        className={classNames(
          "border-subtle divide-subtle mt-3 divide-y rounded-md",
          value.length >= 1 && "border",
          customClassnames?.selectedChildrenListClassnames?.container
        )}
        ref={animationRef}>
        {value.map((children, index) => (
          <li key={index}>
            <div
              className={classNames(
                "flex flex-row items-center gap-3 p-3",
                customClassnames?.selectedChildrenListClassnames?.listItemClassnames?.container
              )}>
              <Avatar
                size="mdLg"
                className={classNames(
                  "overflow-visible",
                  customClassnames?.selectedChildrenListClassnames?.listItemClassnames?.avatar
                )}
                imageSrc={children.owner.avatar}
                alt={children.owner.name || children.owner.email || ""}
              />
              <div className="flex w-full flex-row justify-between">
                <div className="flex flex-col">
                  <span
                    className={classNames(
                      "text text-sm font-semibold leading-none",
                      customClassnames?.selectedChildrenListClassnames?.listItemClassnames?.name
                    )}>
                    {children.owner.name || children.owner.email}
                    <div
                      className={classNames(
                        "flex flex-row gap-1",
                        customClassnames?.selectedChildrenListClassnames?.listItemClassnames?.badgeContainer
                      )}>
                      {children.owner.membership === MembershipRole.OWNER ? (
                        <Badge
                          variant="gray"
                          className={
                            customClassnames?.selectedChildrenListClassnames?.listItemClassnames?.ownerBadge
                          }>
                          {t("owner")}
                        </Badge>
                      ) : (
                        <Badge
                          variant="gray"
                          className={
                            customClassnames?.selectedChildrenListClassnames?.listItemClassnames?.memberBadge
                          }>
                          {t("member")}
                        </Badge>
                      )}
                      {children.hidden && (
                        <Badge
                          variant="gray"
                          className={
                            customClassnames?.selectedChildrenListClassnames?.listItemClassnames?.hiddenBadge
                          }>
                          {t("hidden")}
                        </Badge>
                      )}
                    </div>
                  </span>
                  {children.owner.username && (
                    <small
                      className={classNames(
                        "text-subtle font-normal leading-normal",
                        customClassnames?.selectedChildrenListClassnames?.listItemClassnames?.eventLink
                      )}>
                      {`/${children.owner.username}/${children.slug}`}
                    </small>
                  )}
                </div>
                <div className={classNames("flex flex-row items-center gap-2")}>
                  <Tooltip
                    className={
                      customClassnames?.selectedChildrenListClassnames?.listItemClassnames
                        ?.showEventTypeOnProfileTooltip
                    }
                    content={t("show_eventtype_on_profile")}>
                    <div className="self-center rounded-md p-2">
                      <Switch
                        name="Hidden"
                        checked={!children.hidden}
                        classNames={
                          customClassnames?.selectedChildrenListClassnames?.listItemClassnames
                            ?.showEventTypeOnProfileSwitchClassNames
                        }
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
                        className={
                          customClassnames?.selectedChildrenListClassnames?.listItemClassnames
                            ?.previewEventTypeTooltip
                        }
                        content={t("preview")}>
                        <Button
                          data-testid="preview-button"
                          color="secondary"
                          target="_blank"
                          variant="icon"
                          className={
                            customClassnames?.selectedChildrenListClassnames?.listItemClassnames
                              ?.previewEventTypeButton
                          }
                          href={`${getBookerBaseUrlSync(
                            children.owner.profile?.organization?.slug ?? null
                          )}/${children.owner?.username}/${children.slug}`}
                          StartIcon="external-link"
                        />
                      </Tooltip>
                    )}
                    <Tooltip
                      className={
                        customClassnames?.selectedChildrenListClassnames?.listItemClassnames
                          ?.deleteEventTypeTooltip
                      }
                      content={t("delete")}>
                      <Button
                        color="secondary"
                        target="_blank"
                        variant="icon"
                        className={
                          customClassnames?.selectedChildrenListClassnames?.listItemClassnames
                            ?.deleteEventTypeButton
                        }
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
