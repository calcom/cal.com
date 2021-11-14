import { ClockIcon, ExternalLinkIcon, LinkIcon, TrashIcon } from "@heroicons/react/solid";
import React from "react";

import { useLocale } from "@lib/hooks/useLocale";
import { SVGComponent } from "@lib/types/SVGComponent";

import Switch from "@components/ui/Switch";

interface FlatIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  Icon: SVGComponent;
}

function FlatIconButton(props: FlatIconButtonProps) {
  return (
    <div className="-ml-2">
      <button
        {...props}
        type="button"
        className="flex items-center px-2 py-1 text-sm font-medium text-gray-700 rounded-sm text-md hover:text-gray-900 hover:bg-gray-200">
        <props.Icon className="w-4 h-4 mr-2 text-neutral-500" />

        {props.children}
      </button>
    </div>
  );
}

export default function TeamSettingsRightSidebar() {
  const { t } = useLocale();
  return (
    <div className="px-2 space-y-6">
      <Switch
        name="isHidden"
        // defaultChecked={hidden}
        // onCheckedChange={setHidden}
        label={"Hide team from view"}
      />
      <div className="space-y-1">
        <FlatIconButton Icon={ExternalLinkIcon}>{t("preview")}</FlatIconButton>
        <FlatIconButton Icon={LinkIcon}>{t("copy_link_team")}</FlatIconButton>
        <FlatIconButton Icon={TrashIcon}>{t("disband_team")}</FlatIconButton>
      </div>
      <div className="mt-5 space-y-1">
        <FlatIconButton Icon={ClockIcon}>{"View Availability"}</FlatIconButton>
        <p className="mt-2 text-sm text-gray-500">See your team members availability at a glance.</p>
      </div>
    </div>
  );
}
