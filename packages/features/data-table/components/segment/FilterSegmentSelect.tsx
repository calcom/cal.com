import { useState, useMemo } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import {
  showToast,
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  type IconName,
} from "@calcom/ui";
import { Icon } from "@calcom/ui/components/icon";

import { useDataTable } from "../../hooks";
import type { FilterSegmentOutput } from "../../lib/types";
import { DeleteSegmentDialog } from "./DeleteSegmentDialog";
import { DuplicateSegmentDialog } from "./DuplicateSegmentDialog";
import { RenameSegmentDialog } from "./RenameSegmentDialog";

type SubmenuItem = {
  iconName: IconName;
  labelKey: string;
  onClick: (segment: FilterSegmentOutput) => void;
  isDestructive?: boolean;
};

export function FilterSegmentSelect() {
  const { t } = useLocale();
  const { segments, selectedSegment, segmentId, setSegment } = useDataTable();
  const [renameDialogSegment, setRenameDialogSegment] = useState<FilterSegmentOutput | undefined>();
  const [duplicateDialogSegment, setDuplicateDialogSegment] = useState<FilterSegmentOutput | undefined>();
  const [deleteDialogSegment, setDeleteDialogSegment] = useState<FilterSegmentOutput | undefined>();

  const submenuItems: SubmenuItem[] = [
    {
      iconName: "square-pen",
      labelKey: "rename",
      onClick: (segment) => setRenameDialogSegment(segment),
    },
    {
      iconName: "copy",
      labelKey: "duplicate",
      onClick: (segment) => setDuplicateDialogSegment(segment),
    },
    {
      iconName: "trash-2",
      labelKey: "delete",
      onClick: (segment) => setDeleteDialogSegment(segment),
      isDestructive: true,
    },
  ];

  const utils = trpc.useContext();

  const { mutate: duplicateSegment } = trpc.viewer.filterSegments.create.useMutation({
    onSuccess: () => {
      utils.viewer.filterSegments.list.invalidate();
      showToast(t("filter_segment_duplicated"), "success");
    },
    onError: () => {
      showToast(t("error_duplicating_filter_segment"), "error");
    },
  });

  const { mutate: deleteSegment } = trpc.viewer.filterSegments.delete.useMutation({
    onSuccess: () => {
      utils.viewer.filterSegments.list.invalidate();
      showToast(t("filter_segment_deleted"), "success");
    },
    onError: () => {
      showToast(t("error_deleting_filter_segment"), "error");
    },
  });

  const segmentGroups = useMemo(() => {
    const sortFn = (a: FilterSegmentOutput, b: FilterSegmentOutput) => a.name.localeCompare(b.name);

    const personalSegments = segments?.filter((segment) => !segment.team) || [];
    const teamSegments = segments?.filter((segment) => segment.team) || [];

    // Group team segments by team name
    const teamSegmentsByTeam = teamSegments.reduce<{ [teamName: string]: FilterSegmentOutput[] }>(
      (acc, segment) => {
        const teamName = segment.team.name;
        if (!acc[teamName]) {
          acc[teamName] = [];
        }
        acc[teamName].push(segment);
        return acc;
      },
      {}
    );

    return [
      {
        label: t("personal"),
        segments: personalSegments.sort(sortFn),
      },
      ...Object.entries(teamSegmentsByTeam)
        .map(([teamName, segments]) => ({
          label: teamName,
          segments: segments.sort(sortFn),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    ];
  }, [segments, t]);

  return (
    <>
      <Dropdown>
        <DropdownMenuTrigger asChild>
          <Button color="secondary" StartIcon="funnel" EndIcon="chevron-down">
            {selectedSegment?.name || t("segment")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent align="start" className="w-60">
            {segmentGroups.map((group, index) => (
              <div key={index}>
                {group.label && (
                  <DropdownMenuLabel className={index === 0 ? "" : "mt-2"}>{group.label}</DropdownMenuLabel>
                )}
                {group.segments.map((segment) => (
                  <DropdownItemWithSubmenu
                    key={segment.id}
                    submenuItems={submenuItems}
                    segment={segment}
                    onSelect={() => {
                      if (segmentId === segment.id) {
                        setSegment(undefined);
                      } else {
                        setSegment(segment);
                      }
                    }}>
                    {segment.id === segmentId && <Icon name="check" className="ml-3 h-4 w-4" />}
                    <span className="ml-3">{segment.name}</span>
                  </DropdownItemWithSubmenu>
                ))}
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </Dropdown>

      {renameDialogSegment && (
        <RenameSegmentDialog
          segment={renameDialogSegment}
          onClose={() => setRenameDialogSegment(undefined)}
        />
      )}

      {duplicateDialogSegment && (
        <DuplicateSegmentDialog
          segment={duplicateDialogSegment}
          onClose={() => setDuplicateDialogSegment(undefined)}
        />
      )}

      {deleteDialogSegment && (
        <DeleteSegmentDialog
          segment={deleteDialogSegment}
          onClose={() => setDeleteDialogSegment(undefined)}
        />
      )}
    </>
  );
}

function DropdownItemWithSubmenu({
  onSelect,
  segment,
  submenuItems,
  children,
}: {
  onSelect: () => void;
  segment: FilterSegmentOutput;
  submenuItems: SubmenuItem[];
  children: React.ReactNode;
}) {
  const { t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  return (
    <DropdownMenuItem className="cursor-pointer" onSelect={onSelect}>
      <div className="flex items-center">
        {children}
        <div className="grow" />
        <Dropdown open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button StartIcon="ellipsis" variant="icon" color="minimal" className="rounded-full" />
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent align="start" side="right" sideOffset={8}>
              {submenuItems.map((item, index) => (
                <DropdownMenuItem key={index}>
                  <DropdownItem
                    color={item.isDestructive ? "destructive" : undefined}
                    StartIcon={item.iconName}
                    onClick={(event) => {
                      event.preventDefault();
                      item.onClick(segment);
                      setIsOpen(false);
                    }}>
                    {t(item.labelKey)}
                  </DropdownItem>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </Dropdown>
      </div>
    </DropdownMenuItem>
  );
}
