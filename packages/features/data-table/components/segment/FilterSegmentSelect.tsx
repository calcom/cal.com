import { useSession } from "next-auth/react";
import { useState, useMemo } from "react";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@calcom/ui/components/dropdown";
import { Icon, type IconName } from "@calcom/ui/components/icon";

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
  adminOnly: boolean;
};

export function FilterSegmentSelect() {
  const { t } = useLocale();
  const { segments, selectedSegment, segmentId, setSegmentId, isSegmentEnabled } = useDataTable();
  const [segmentToRename, setSegmentToRename] = useState<FilterSegmentOutput | undefined>();
  const [segmentToDuplicate, setSegmentToDuplicate] = useState<FilterSegmentOutput | undefined>();
  const [segmentToDelete, setSegmentToDelete] = useState<FilterSegmentOutput | undefined>();

  const submenuItems: SubmenuItem[] = [
    {
      iconName: "square-pen",
      labelKey: "rename",
      onClick: (segment) => setSegmentToRename(segment),
      adminOnly: true,
    },
    {
      iconName: "copy",
      labelKey: "duplicate",
      onClick: (segment) => setSegmentToDuplicate(segment),
      adminOnly: false,
    },
    {
      iconName: "trash-2",
      labelKey: "delete",
      onClick: (segment) => setSegmentToDelete(segment),
      isDestructive: true,
      adminOnly: true,
    },
  ];

  const segmentGroups = useMemo(() => {
    const sortFn = (a: FilterSegmentOutput, b: FilterSegmentOutput) => a.name.localeCompare(b.name);

    const personalSegments = segments?.filter((segment) => !segment.team) || [];
    const teamSegments =
      segments?.filter(
        (segment): segment is FilterSegmentOutput & { team: NonNullable<FilterSegmentOutput["team"]> } =>
          segment.team !== null
      ) || [];

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
      ...(personalSegments.length > 0
        ? [
            {
              label: t("personal"),
              segments: personalSegments.sort(sortFn),
            },
          ]
        : []),
      ...Object.entries(teamSegmentsByTeam)
        .map(([teamName, segments]) => ({
          label: teamName,
          segments: segments.sort(sortFn),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    ];
  }, [segments, t]);

  if (!isSegmentEnabled) {
    return (
      <Button color="secondary" StartIcon="list-filter" EndIcon="chevron-down" disabled>
        {t("segment")}
      </Button>
    );
  }

  return (
    <>
      <Dropdown>
        <DropdownMenuTrigger asChild>
          <Button
            color="secondary"
            StartIcon="list-filter"
            EndIcon="chevron-down"
            data-testid="filter-segment-select">
            {selectedSegment?.name || t("segment")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent align="start" className="w-60" data-testid="filter-segment-select-content">
            {segmentGroups.length === 0 && <p className="text-subtle px-3 py-1">{t("no_segments")}</p>}

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
                        setSegmentId(null);
                      } else {
                        setSegmentId(segment.id);
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

      {segmentToRename && (
        <RenameSegmentDialog segment={segmentToRename} onClose={() => setSegmentToRename(undefined)} />
      )}

      {segmentToDuplicate && (
        <DuplicateSegmentDialog
          segment={segmentToDuplicate}
          onClose={() => setSegmentToDuplicate(undefined)}
        />
      )}

      {segmentToDelete && (
        <DeleteSegmentDialog segment={segmentToDelete} onClose={() => setSegmentToDelete(undefined)} />
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
  const session = useSession();
  const isAdminOrOwner = checkAdminOrOwner(session.data?.user?.org?.role);

  // Filter submenu items based on segment type and user role
  const filteredSubmenuItems = submenuItems.filter((item) => {
    if (!segment.team) {
      // Personal segments: show all actions
      return true;
    }

    // Team segments: show if not admin-only or if user is admin/owner
    return !item.adminOnly || isAdminOrOwner;
  });

  return (
    <DropdownMenuItem className="cursor-pointer" onSelect={onSelect}>
      <div className="flex items-center">
        {children}
        <div className="grow" />
        <Dropdown open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              StartIcon="ellipsis"
              variant="icon"
              color="minimal"
              className="rounded-full"
              data-testid="filter-segment-select-submenu-button"
              onClick={(event) => {
                event.preventDefault();
                setIsOpen((prev) => !prev);
              }}
            />
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent
              align="start"
              side="right"
              sideOffset={8}
              data-testid="filter-segment-select-submenu-content">
              {filteredSubmenuItems.map((item, index) => (
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
