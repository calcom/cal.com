import * as RadioGroup from "@radix-ui/react-radio-group";
import { useEffect, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
  Input,
  Label,
  Select,
  showToast,
} from "@calcom/ui";

import { useDataTable } from "../hooks";

type FilterSegment = RouterOutputs["viewer"]["filterSegments"]["list"][number];
type Team = RouterOutputs["viewer"]["teams"]["list"][number];
type Scope = "TEAM" | "USER";

interface SaveFilterSegmentButtonProps {
  tableIdentifier: string;
  selectedSegmentId?: number;
  onSave?: () => void;
}

export function SaveFilterSegmentButton({
  tableIdentifier,
  selectedSegmentId,
  onSave,
}: SaveFilterSegmentButtonProps) {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isTeamSegment, setIsTeamSegment] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<number>();
  const [saveMode, setSaveMode] = useState<"create" | "override">("create");

  const { activeFilters, sorting, columnVisibility, columnSizing } = useDataTable();

  const { data: teams } = trpc.viewer.teams.list.useQuery();
  const { data: selectedSegment } = trpc.viewer.filterSegments.list.useQuery(
    { tableIdentifier },
    {
      select: (segments: FilterSegment[]) => segments.find((segment) => segment.id === selectedSegmentId),
    }
  );

  const { data: membership } = trpc.viewer.teams.getMembershipbyUser.useQuery(
    {
      teamId: teams?.[0]?.id || 0,
      memberId: teams?.[0]?.members?.[0]?.userId || 0,
    },
    {
      enabled: !!teams?.[0]?.members?.[0]?.userId,
    }
  );

  const isAdminOrOwner = membership?.role === "ADMIN" || membership?.role === "OWNER";

  const { mutate: createSegment } = trpc.viewer.filterSegments.create.useMutation({
    onSuccess: () => {
      utils.viewer.filterSegments.list.invalidate();
      showToast(t("filter_segment_created"), "success");
      setIsOpen(false);
      onSave?.();
    },
    onError: () => {
      showToast(t("error_creating_filter_segment"), "error");
    },
  });

  const { mutate: updateSegment } = trpc.viewer.filterSegments.update.useMutation({
    onSuccess: () => {
      utils.viewer.filterSegments.list.invalidate();
      showToast(t("filter_segment_updated"), "success");
      setIsOpen(false);
      onSave?.();
    },
    onError: () => {
      showToast(t("error_updating_filter_segment"), "error");
    },
  });

  useEffect(() => {
    if (!isOpen) {
      setIsTeamSegment(false);
      setSelectedTeamId(undefined);
      setSaveMode("create");
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;

    const segmentData = {
      name,
      tableIdentifier,
      activeFilters,
      sorting,
      columnVisibility,
      columnSizing,
      perPage: 10,
    };

    if (saveMode === "override" && selectedSegment) {
      const scope = selectedSegment.scope as Scope;
      updateSegment({
        id: selectedSegment.id,
        scope,
        teamId: selectedSegment.teamId || 0,
        ...segmentData,
      });
    } else {
      const scope = isTeamSegment ? ("TEAM" as const) : ("USER" as const);
      createSegment({
        ...segmentData,
        scope,
        teamId: isTeamSegment && selectedTeamId ? selectedTeamId : 0,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button color="secondary">{t("save_segment")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader title={t("save_segment")} />
        <form onSubmit={handleSubmit}>
          {selectedSegment ? (
            <div className="mb-4">
              <RadioGroup.Root
                defaultValue="create"
                onValueChange={(value: string) => setSaveMode(value as "create" | "override")}
                className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroup.Item
                    value="override"
                    id="override"
                    className="h-4 w-4 rounded-full border border-gray-300 hover:border-gray-400">
                    <RadioGroup.Indicator className="relative flex h-full w-full items-center justify-center after:block after:h-2 after:w-2 after:rounded-full after:bg-black" />
                  </RadioGroup.Item>
                  <Label htmlFor="override">{t("override_segment", { name: selectedSegment.name })}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroup.Item
                    value="create"
                    id="create"
                    className="h-4 w-4 rounded-full border border-gray-300 hover:border-gray-400">
                    <RadioGroup.Indicator className="relative flex h-full w-full items-center justify-center after:block after:h-2 after:w-2 after:rounded-full after:bg-black" />
                  </RadioGroup.Item>
                  <Label htmlFor="create">{t("create_new_segment")}</Label>
                </div>
              </RadioGroup.Root>
            </div>
          ) : null}

          <div className="space-y-4">
            <div>
              <Label>{t("name")}</Label>
              <Input name="name" required />
            </div>

            {isAdminOrOwner && saveMode === "create" && (
              <>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="teamSegment"
                    checked={isTeamSegment}
                    onChange={(e) => setIsTeamSegment(e.target.checked)}
                  />
                  <Label htmlFor="teamSegment">{t("save_for_team")}</Label>
                </div>

                {isTeamSegment && teams && teams.length > 0 && (
                  <div>
                    <Label>{t("select_team")}</Label>
                    <Select
                      options={teams.map((team) => ({
                        value: team.id.toString(),
                        label: team.name,
                      }))}
                      value={selectedTeamId?.toString()}
                      onValueChange={(value: string) => setSelectedTeamId(parseInt(value))}
                      placeholder={t("select_team")}
                    />
                  </div>
                )}
              </>
            )}

            <DialogFooter>
              <Button type="submit">{t("save")}</Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
