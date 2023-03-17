import { useAutoAnimate } from "@formkit/auto-animate/react";
import { MembershipRole } from "@prisma/client";
import type { Props } from "react-select";

import { classNames } from "@calcom/lib";
import { CAL_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Avatar, Badge, Button, ButtonGroup, Select, Switch, Tooltip } from "@calcom/ui";
import { FiExternalLink, FiX } from "@calcom/ui/components/icon";

export type ChildrenEventType = {
  value: string;
  label: string;
  created: boolean;
  owner: {
    id: number;
    name: string;
    username: string;
    membership: MembershipRole;
    eventTypeSlugs: { slug: string }[];
  };
  slug: string;
  hidden: boolean;
};

export const ChildrenEventTypeSelect = ({
  options = [],
  value = [],
  ...props
}: Omit<Props<ChildrenEventType, true>, "value" | "onChange"> & {
  value?: ChildrenEventType[];
  onChange: (value: readonly ChildrenEventType[]) => void;
}) => {
  const { t } = useLocale();

  const [animationRef] = useAutoAnimate<HTMLUListElement>();

  return (
    <>
      <Select
        styles={{
          option: (styles, { isDisabled }) => ({
            ...styles,
            backgroundColor: isDisabled ? "#F5F5F5" : "inherit",
          }),
        }}
        name={props.name}
        placeholder={t("select")}
        isSearchable={false}
        options={options}
        value={value}
        isMulti
        {...props}
      />
      {/* This class name conditional looks a bit odd but it allows a seemless transition when using autoanimate
       - Slides down from the top instead of just teleporting in from nowhere*/}
      <ul
        className={classNames("mt-3 divide-y rounded-md", value.length >= 1 && "border")}
        ref={animationRef}>
        {value.map((children, index) => (
          <li key={index}>
            <div className="flex flex-row items-center gap-3 p-3">
              <Avatar
                size="mdLg"
                imageSrc={`${CAL_URL}/${children.owner.username}/avatar.png`}
                alt={children.owner.name || ""}
              />
              <div className="flex w-full flex-row justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold leading-none text-black">
                    {children.owner.name}
                    {children.owner.membership === MembershipRole.OWNER ? (
                      <Badge className="ml-2" variant="blue">
                        {t("owner")}
                      </Badge>
                    ) : (
                      <Badge className="ml-2" variant="gray">
                        {t("member")}
                      </Badge>
                    )}
                  </span>
                  <small className="font-normal leading-normal text-gray-700">
                    {`/${children.owner.username}/${children.slug}`}
                  </small>
                </div>
                <div className="flex flex-row items-center gap-2">
                  {children.hidden && <Badge variant="gray">{t("hidden")}</Badge>}
                  <Tooltip content={t("show_eventtype_on_profile")}>
                    <div className="self-center rounded-md p-2 hover:bg-gray-200">
                      <Switch
                        name="Hidden"
                        checked={!children.hidden}
                        onCheckedChange={(checked) => {
                          const newData = value.map((item) =>
                            item.value === children.value ? { ...item, hidden: !checked } : item
                          );
                          props.onChange(newData);
                        }}
                      />
                    </div>
                  </Tooltip>
                  <ButtonGroup combined>
                    {children.created && (
                      <Tooltip content={t("preview")}>
                        <Button
                          color="secondary"
                          target="_blank"
                          variant="icon"
                          href={`${CAL_URL}/${children.owner?.username}/${children.slug}`}
                          StartIcon={FiExternalLink}
                        />
                      </Tooltip>
                    )}
                    <Tooltip content={t("delete")}>
                      <Button
                        color="secondary"
                        target="_blank"
                        variant="icon"
                        onClick={() => props.onChange(value.filter((item) => item.value !== children.value))}
                        StartIcon={FiX}
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
