import { MoreVertical } from "lucide-react";
import { useState } from "react";

import { VerticalDivider, Button } from "@calcom/ui";

import { LargeScreenCTA } from "./large-screen/index";

type PlatformAvailabilitySettingsCTAProps = {
  largeScreenCTA: {
    isButtonDisabled: boolean;
    isSwitchDisabled: boolean;
    onDeleteConfirmation: () => void;
  };
};

export function PlatformAvailabilitySettingsCTA({ largeScreenCTA }: PlatformAvailabilitySettingsCTAProps) {
  const [openSidebar, setOpenSidebar] = useState(false);

  return (
    <div className="flex items-center justify-end">
      <LargeScreenCTA
        onDeleteConfirmation={largeScreenCTA.onDeleteConfirmation}
        isSwitchDisabled={largeScreenCTA.isSwitchDisabled}
        isDeleteButtonDisabled={largeScreenCTA.isButtonDisabled}
      />
      <VerticalDivider className="hidden sm:inline" />
      <div className="border-default border-l-2" />
      <Button className="ml-4 lg:ml-0" type="submit" form="availability-form" loading={false}>
        Save
      </Button>
      <Button
        className="ml-3 sm:hidden"
        StartIcon={MoreVertical}
        variant="icon"
        color="secondary"
        onClick={() => setOpenSidebar(true)}
      />
    </div>
  );
}
