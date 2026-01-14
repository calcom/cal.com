import { useAutoAnimate } from "@formkit/auto-animate/react";
import { UserPlusIcon, XIcon } from "lucide-react";
import type { Props } from "react-select";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Avatar } from "@calcom/ui/components/avatar";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { Label, Select } from "@calcom/ui/components/form";

export type CheckedUserSelectOption = {
  avatar: string;
  label: string;
  value: string;
  disabled?: boolean;
};

export const CheckedUserSelect = ({
  options = [],
  value = [],
  ...props
}: Omit<Props<CheckedUserSelectOption, true>, "value" | "onChange"> & {
  value?: readonly CheckedUserSelectOption[];
  onChange: (value: readonly CheckedUserSelectOption[]) => void;
}) => {
  const { t } = useLocale();

  const [animationRef] = useAutoAnimate<HTMLUListElement>();

  return (
    <>
      <Select
        name={props.name}
        placeholder={props.placeholder || t("select")}
        isSearchable={false}
        options={options}
        value={value}
        isMulti
        {...props}
      />
      {value.length > 0 ? (
        <div className="mt-6">
          <Label>{t("assigned_to")}</Label>
          <div className="flex overflow-hidden rounded-md border border-gray-200 bg-white">
            <ul className="w-full" data-testid="managed-event-types" ref={animationRef}>
              {value.map((option, index) => {
                return (
                  <li
                    key={option.value}
                    className={`flex px-3 py-2 ${index === value.length - 1 ? "" : "border-b"}`}>
                    <Avatar size="sm" imageSrc={option.avatar} alt={option.label} />
                    <p className="my-auto ml-3 text-sm text-gray-900">{option.label}</p>
                                        <XIcon
                                          onClick={() => props.onChange(value.filter((item) => item.value !== option.value))}
                                          className="my-auto ml-auto h-4 w-4"
                                        />
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : (
        <div className="mt-6">
                    <EmptyScreen
                      Icon={UserPlusIcon}
                      headline={t("no_assigned_members")}
                      description={t("start_assigning_members_above")}
                    />
        </div>
      )}
    </>
  );
};

export default CheckedUserSelect;
