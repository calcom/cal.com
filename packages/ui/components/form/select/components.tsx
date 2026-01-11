import type { GroupBase, InputProps, OptionProps, ControlProps } from "react-select";
import { components as reactSelectComponents } from "react-select";

import classNames from "@calcom/ui/classNames";

import { Badge, CreditsBadge, UpgradeTeamsBadge } from "../../badge";
import { Icon } from "../../icon";
import type { SelectProps } from "./types";

export const InputComponent = <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  inputClassName,
  ...props
}: InputProps<Option, IsMulti, Group>) => {
  return (
    <reactSelectComponents.Input
      // disables our default form focus highlight on the react-select input element
      inputClassName={classNames(
        "focus:ring-0 focus:ring-offset-0 !text-default dark:text-white!",
        inputClassName
      )}
      {...props}
    />
  );
};

type ExtendedOption = {
  value: string | number;
  label: string;
  needsTeamsUpgrade?: boolean;
  needsCredits?: boolean;
  isCalAi?: boolean;
  creditsTeamId?: number;
  isOrganization?: boolean;
};

export const OptionComponent = <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  ...props
}: OptionProps<Option, IsMulti, Group>) => {
  return (
    // This gets styled in the select classNames prop now - handles overrides with styles vs className here doesn't
    <reactSelectComponents.Option {...props}>
      <div className="flex items-center justify-between">
        <span className="w-full" data-testid={`select-option-${(props as unknown as ExtendedOption).value}`}>
          {(props.data as unknown as ExtendedOption).isCalAi ? (
            <Badge startIcon="sparkles" variant="purple" className="mr-1 hidden md:inline-flex">
              Cal.ai
            </Badge>
          ) : (
            <></>
          )}
          {props.label || <>&nbsp;</>}
        </span>
        {(props.data as unknown as ExtendedOption).needsTeamsUpgrade ? (
          <UpgradeTeamsBadge checkForActiveStatus={true} />
        ) : (props.data as unknown as ExtendedOption).needsCredits ? (
          <CreditsBadge
            teamId={(props.data as unknown as ExtendedOption).creditsTeamId}
            isOrganization={(props.data as unknown as ExtendedOption).isOrganization}
          />
        ) : (
          <></>
        )}
        {props.isSelected && <Icon name="check" className="ml-2 h-4 w-4" />}
      </div>
    </reactSelectComponents.Option>
  );
};

export const ControlComponent = <
  Option,
  IsMulti extends boolean,
  Group extends GroupBase<Option> = GroupBase<Option>
>(
  controlProps: ControlProps<Option, IsMulti, Group> & {
    selectProps: SelectProps<Option, IsMulti, Group>;
  }
) => {
  const dataTestId = controlProps.selectProps["data-testid"] ?? "select-control";
  return (
    <span data-testid={dataTestId}>
      <reactSelectComponents.Control {...controlProps} />
    </span>
  );
};

// We need to override this component if we need a icon - we can't simpily override styles
type IconLeadingProps = {
  icon: React.ReactNode;
  children?: React.ReactNode;
} & React.ComponentProps<typeof reactSelectComponents.Control>;

export const IconLeading = ({ icon, children, ...props }: IconLeadingProps) => {
  return (
    <reactSelectComponents.Control {...props}>
      {icon}
      {children}
    </reactSelectComponents.Control>
  );
};
