import { useState, useEffect } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Label, Select } from "@calcom/ui/components/form";
import { Switch } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { Tooltip } from "@calcom/ui/components/tooltip";

export interface TeamMember {
  id: number;
  name: string | null;
  email: string;
  avatarUrl?: string | null;
  defaultScheduleId?: number | null;
}

interface TeamMemberOption {
  value: string;
  label: string;
  email: string;
  avatar?: string;
  defaultScheduleId?: number | null;
}

interface TeamMemberSelectProps {
  teamMembers: TeamMember[];
  selectedMembers: number[];
  onChange: (memberIds: number[]) => void;
  onSelectAll?: (selectAll: boolean) => void;
  selectAllEnabled?: boolean;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  size?: "sm" | undefined;
  sendToAll?: boolean;
}

export const TeamMemberSelect = ({
  teamMembers,
  selectedMembers,
  onChange,
  onSelectAll,
  selectAllEnabled = false,
  className = "",
  placeholder,
  disabled = false,
  size,
  sendToAll = false,
}: TeamMemberSelectProps) => {
  const { t } = useLocale();
  const [selectAll, setSelectAll] = useState(sendToAll);

  // Keep selectAll state in sync with parent
  useEffect(() => {
    setSelectAll(sendToAll);
  }, [sendToAll]);

  // Convert team members to options format
  const options: TeamMemberOption[] = teamMembers.map((member) => ({
    value: member.id.toString(),
    label: member.name || member.email,
    email: member.email,
    avatar: member.avatarUrl || undefined,
    defaultScheduleId: member.defaultScheduleId,
  }));

  // Convert selected member IDs to option format
  const selectedOptions = options.filter((option) => selectedMembers.includes(parseInt(option.value, 10)));

  const handleSelectAllChange = (checked: boolean) => {
    setSelectAll(checked);
    if (onSelectAll) {
      onSelectAll(checked);
    }
    if (checked) {
      onChange(teamMembers.map((member) => member.id));
    } else {
      onChange([]);
    }
  };

  return (
    <div>
      <Label htmlFor="routing-form-select-members">{t("routing_form_select_members_to_email")}</Label>
      <div className="stack-y-4">
        <Select
          id="routing-form-select-members"
          data-testid="routing-form-select-members"
          isMulti
          options={options}
          value={selectedOptions}
          onChange={(newValue) => {
            const selectedIds = (newValue as TeamMemberOption[]).map((option) => parseInt(option.value, 10));
            onChange(selectedIds);
          }}
          className={className}
          placeholder={placeholder || t("select_members")}
          isDisabled={disabled || selectAll}
          size={size}
        />
        {selectAllEnabled && (
          <div className="flex items-center space-x-2">
            <Switch
              checked={selectAll}
              onCheckedChange={handleSelectAllChange}
              disabled={disabled}
              size="sm"
              data-testid="assign-all-team-members-toggle"
            />
            <span className="text-default text-sm">{t("select_all_members")}</span>
            <Tooltip content={t("select_all_members_tooltip")}>
              <Icon name="info" className="text-default text-sm" />
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
};
