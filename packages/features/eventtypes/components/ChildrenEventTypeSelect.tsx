import { getBookerBaseUrlSync } from "@calcom/features/ee/organizations/lib/getBookerBaseUrlSync";
import type { ChildrenEventType } from "@calcom/features/eventtypes/lib/childrenEventType";
import type { SelectClassNames } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import classNames from "@calcom/ui/classNames";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { ButtonGroup } from "@calcom/ui/components/buttonGroup";
import { Select, Switch } from "@calcom/ui/components/form";
import { Tooltip } from "@calcom/ui/components/tooltip";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { Props } from "react-select";

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
  ...props
}: Omit<Props<ChildrenEventType, true>, "value" | "onChange"> & {
  value?: ChildrenEventType[];
  onChange: (value: readonly ChildrenEventType[]) => void;
  customClassNames?: ChildrenEventTypeSelectCustomClassNames;
}) => {
  const { t } = useLocale();
  const [animationRef] = useAutoAnimate<HTMLUListElement>();

  return (
    <>
      <Select
        name={props.name}
        placeholder={t("select")}
        options={options}
        className={customClassNames?.assignToSelect?.select}
        innerClassNames={customClassNames?.assignToSelect?.innerClassNames}
        value={value}
        isMulti
        {...props}
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
