import { useEffect, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
  Form,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  showToast,
} from "@calcom/ui";

import { useDataTable } from "../hooks";

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
      select: (segments) => segments.find((segment) => segment.id === selectedSegmentId),
    }
  );

  const { data: membership } = trpc.viewer.teams.getMembershipbyUser.useQuery(
    {
      memberId: teams?.[0]?.members[0]?.userId || 0,
    },
    {
      enabled: !!teams?.[0]?.members[0]?.userId,
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

  const handleSubmit = (values: { name: string }) => {
    const segmentData = {
      name: values.name,
      tableIdentifier,
      activeFilters,
      sorting,
      columnVisibility,
      columnSizing,
      perPage: 10,
    };

    if (saveMode === "override" && selectedSegment) {
      updateSegment({
        id: selectedSegment.id,
        scope: selectedSegment.scope,
        teamId: selectedSegment.teamId,
        ...segmentData,
      });
    } else {
      createSegment({
        ...segmentData,
        scope: isTeamSegment ? "TEAM" : "USER",
        teamId: isTeamSegment ? selectedTeamId : undefined,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{t("save_segment")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader title={t("save_segment")} />
        <Form onSubmit={handleSubmit}>
          {selectedSegment ? (
            <div className="mb-4">
              <RadioGroup
                defaultValue="create"
                onValueChange={(value) => setSaveMode(value as "create" | "override")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="override" id="override" />
                  <Label htmlFor="override">{t("override_segment", { name: selectedSegment.name })}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="create" id="create" />
                  <Label htmlFor="create">{t("create_new_segment")}</Label>
                </div>
              </RadioGroup>
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
                      value={selectedTeamId?.toString()}
                      onValueChange={(value) => setSelectedTeamId(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("select_team")} />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id.toString()}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            <DialogFooter>
              <Button type="submit">{t("save")}</Button>
            </DialogFooter>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
