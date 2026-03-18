import type { ChildrenEventTypeSelectCustomClassNames } from "@calcom/features/eventtypes/components/ChildrenEventTypeSelect";
import ChildrenEventTypeSelect from "@calcom/features/eventtypes/components/ChildrenEventTypeSelect";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Label } from "@calcom/ui/components/form";
import type { ComponentProps } from "react";
import type { Options } from "react-select";
import type { mapMemberToChildrenOption } from "./EventTeamAssignmentTab";

export const ChildrenEventTypesList = ({
  options = [],
  value,
  onChange,
  customClassNames,
  ...rest
}: {
  value: ReturnType<typeof mapMemberToChildrenOption>[];
  onChange?: (options: ReturnType<typeof mapMemberToChildrenOption>[]) => void;
  options?: Options<ReturnType<typeof mapMemberToChildrenOption>>;
  customClassNames?: ChildrenEventTypeSelectCustomClassNames;
} & Omit<Partial<ComponentProps<typeof ChildrenEventTypeSelect>>, "onChange" | "value">) => {
  const { t } = useLocale();
  return (
    <div className={classNames("stack-y-5 flex flex-col", customClassNames?.assignToSelect?.container)}>
      <div>
        <Label className={customClassNames?.assignToSelect?.label}>{t("assign_to")}</Label>
        <ChildrenEventTypeSelect
          aria-label="assignment-dropdown"
          data-testid="assignment-dropdown"
          onChange={(options) => {
            onChange &&
              onChange(
                options.map((option) => ({
                  ...option,
                }))
              );
          }}
          value={value}
          options={options.filter((opt) => !value.find((val) => val.owner.id.toString() === opt.value))}
          controlShouldRenderValue={false}
          customClassNames={customClassNames}
          {...rest}
        />
      </div>
    </div>
  );
};
