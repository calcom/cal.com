import { useState } from "react";

import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { ChevronDownIcon, UsersIcon } from "@coss/ui/icons";
import { Button } from "@coss/ui/components/button";
import { Frame, FrameHeader, FramePanel } from "@coss/ui/components/frame";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@coss/ui/components/collapsible";
import {
  ListItem,
  ListItemActions,
  ListItemContent,
  ListItemDescription,
  ListItemHeader,
  ListItemTitle,
} from "@coss/ui/shared/list-item";
import { Switch } from "@coss/ui/components/switch";
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import { toastManager } from "@coss/ui/components/toast";

import { AssignFeatureSheet } from "./AssignFeatureSheet";

export const FlagAdminList = () => {
  const [data] = trpc.viewer.features.list.useSuspenseQuery();
  const [selectedFlag, setSelectedFlag] = useState<Flag | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const groupedFlags = data.reduce(
    (acc, flag) => {
      const type = flag.type || "OTHER";
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(flag);
      return acc;
    },
    {} as Record<string, typeof data>
  );

  const sortedTypes = Object.keys(groupedFlags).sort();

  const handleAssignUsers = (flag: Flag) => {
    setSelectedFlag(flag);
    setSheetOpen(true);
  };

  const utils = trpc.useUtils();
  const toggleMutation = trpc.viewer.admin.toggleFeatureFlag.useMutation({
    onSuccess: () => {
      toastManager.add({ title: "Flags successfully updated", type: "success" });
      utils.viewer.features.list.invalidate();
      utils.viewer.features.map.invalidate();
    },
  });

  const handleToggle = (flag: Flag, checked: boolean) => {
    toggleMutation.mutate({ slug: flag.slug, enabled: checked });
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        {sortedTypes.map((type) => (
          <FlagGroup
            key={type}
            flags={groupedFlags[type]}
            type={type.replace(/_/g, " ")}
            onAssignUsers={handleAssignUsers}
            onToggle={handleToggle}
          />
        ))}
      </div>
      <AssignFeatureSheet flag={selectedFlag} open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
};

type Flag = RouterOutputs["viewer"]["features"]["list"][number];

interface FlagGroupProps {
  type: string;
  flags: Flag[];
  onAssignUsers: (flag: Flag) => void;
  onToggle: (flag: Flag, checked: boolean) => void;
}

function FlagGroup({ type, flags, onAssignUsers, onToggle }: FlagGroupProps) {
  return (
    <Frame>
      <Collapsible defaultOpen>
        <FrameHeader className="flex flex-row items-center justify-between px-2 py-2">
          <CollapsibleTrigger
            className="data-panel-open:[&_svg]:rotate-180"
            render={<Button variant="ghost" />}
          >
            <ChevronDownIcon aria-hidden="true" />
            <span className="lowercase first-line:capitalize">{type}</span>
          </CollapsibleTrigger>
        </FrameHeader>
        <CollapsiblePanel>
          <FramePanel className="p-0">
            {flags.map((flag) => (
              <ListItem key={flag.slug}>
                <ListItemContent>
                  <ListItemHeader>
                    <ListItemTitle>{flag.slug}</ListItemTitle>
                    <ListItemDescription>{flag.description}</ListItemDescription>
                  </ListItemHeader>
                </ListItemContent>
                <ListItemActions>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Switch
                          aria-label={`Toggle ${flag.slug} feature flag`}
                          defaultChecked={flag.enabled}
                          onCheckedChange={(checked) => onToggle(flag, checked)}
                        />
                      }
                    />
                    <TooltipPopup sideOffset={11}>
                      {flag.enabled ? "Disable flag" : "Enable flag"}
                    </TooltipPopup>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          aria-label={`Assign users to ${flag.slug} feature flag`}
                          size="icon"
                          variant="outline"
                          onClick={() => onAssignUsers(flag)}
                        >
                          <UsersIcon aria-hidden="true" />
                        </Button>
                      }
                    />
                    <TooltipPopup sideOffset={11}>Assign to users</TooltipPopup>
                  </Tooltip>
                </ListItemActions>
              </ListItem>
            ))}
          </FramePanel>
        </CollapsiblePanel>
      </Collapsible>
    </Frame>
  );
}

