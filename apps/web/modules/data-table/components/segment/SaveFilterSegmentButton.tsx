import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import posthog from "posthog-js";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { type FilterSegmentScope } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "@calcom/ui/components/dialog";
import { Form, Input, Label, Select, Switch } from "@calcom/ui/components/form";
import { RadioGroup, RadioField } from "@calcom/ui/components/radio";
import { showToast } from "@calcom/ui/components/toast";

import { useDataTable } from "@calcom/features/data-table/hooks";

interface FormValues {
  name: string;
  scope: FilterSegmentScope;
  teamId?: number;
}

export function SaveFilterSegmentButton() {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [isOpen, setIsOpen] = useState(false);
  const [isTeamSegment, setIsTeamSegment] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<number>();
  const session = useSession();
  const isAdminOrOwner = checkAdminOrOwner(session.data?.user?.org?.role);

  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      scope: "USER",
    },
  });

  const {
    tableIdentifier,
    activeFilters,
    sorting,
    columnVisibility,
    columnSizing,
    selectedSegment,
    canSaveSegment,
    isSegmentEnabled,
    setSegmentId,
    pageSize,
    searchTerm,
  } = useDataTable();

  const [saveMode, setSaveMode] = useState<"create" | "update">(() =>
    selectedSegment && selectedSegment.type === "user" ? "update" : "create"
  );

  // When the dialog is not open,
  // switch `saveMode` according to `selectedSegment`
  useEffect(() => {
    if (isOpen) {
      return;
    }
    setSaveMode(selectedSegment && selectedSegment.type === "user" ? "update" : "create");
  }, [selectedSegment, isOpen]);

  const { data: teams } = trpc.viewer.teams.list.useQuery();

  const { mutate: createSegment } = trpc.viewer.filterSegments.create.useMutation({
    onSuccess: (segment) => {
      utils.viewer.filterSegments.list.invalidate();
      showToast(t("filter_segment_saved"), "success");
      setSegmentId({ id: segment.id, type: "user" }, { type: "user", ...segment });
      setIsOpen(false);
    },
    onError: () => {
      showToast(t("error_saving_filter_segment"), "error");
    },
  });

  const { mutate: updateSegment } = trpc.viewer.filterSegments.update.useMutation({
    onSuccess: () => {
      utils.viewer.filterSegments.list.invalidate();
      showToast(t("filter_segment_updated"), "success");
      setIsOpen(false);
    },
    onError: () => {
      showToast(t("error_updating_filter_segment"), "error");
    },
  });

  const onSubmit = (values: FormValues) => {
    if (isTeamSegment && !selectedTeamId) {
      showToast(t("please_select_team"), "error");
      return;
    }

    const segmentData = {
      tableIdentifier,
      activeFilters,
      sorting,
      columnVisibility,
      columnSizing,
      perPage: pageSize,
      searchTerm,
    };

    if (saveMode === "update" && selectedSegment && selectedSegment.type === "user") {
      const scope = selectedSegment.scope;
      if (scope === "TEAM") {
        updateSegment({
          id: selectedSegment.id,
          scope,
          teamId: selectedSegment.teamId || 0,
          name: selectedSegment.name,
          ...segmentData,
        });
      } else {
        updateSegment({
          id: selectedSegment.id,
          scope,
          name: selectedSegment.name,
          ...segmentData,
        });
      }
    } else {
      if (isTeamSegment) {
        createSegment({
          ...segmentData,
          name: values.name,
          scope: "TEAM",
          teamId: selectedTeamId || 0,
        });
      } else {
        createSegment({
          ...segmentData,
          name: values.name,
          scope: "USER",
        });
      }
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset form state when dialog closes
      setIsTeamSegment(false);
      setSelectedTeamId(undefined);
      setSaveMode(selectedSegment && selectedSegment.type === "user" ? "update" : "create");
      form.reset();
    }
    setIsOpen(open);
  };

  if (!isSegmentEnabled) {
    return (
      <Button StartIcon="bookmark" color="secondary" disabled>
        {t("save")}
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          StartIcon="bookmark"
          color="secondary"
          onClick={() => posthog.capture("insights_routing_save_filter_clicked")}
          disabled={!canSaveSegment}
          data-testid="save-filter-segment-button">
          {t("save")}
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="save-filter-segment-dialog">
        <DialogHeader title={t("save_segment")} />
        <Form form={form} handleSubmit={onSubmit}>
          {selectedSegment && selectedSegment.type === "user" ? (
            <div className="mb-4">
              <RadioGroup
                defaultValue="update"
                onValueChange={(value: string) => setSaveMode(value as "create" | "update")}
                className="stack-y-2">
                <RadioField
                  id="update_segment"
                  label={t("override_segment", { name: selectedSegment.name })}
                  value="update"
                />
                <RadioField id="create_segment" label={t("create_new_segment")} value="create" />
              </RadioGroup>
            </div>
          ) : null}

          <div>
            {saveMode === "create" && (
              <div>
                <Label>{t("name")}</Label>
                <Input {...form.register("name")} data-testid="save-filter-segment-name" required />
              </div>
            )}

            {isAdminOrOwner && saveMode === "create" && (
              <>
                <div className="-ml-2 mt-4">
                  <Switch
                    id="teamSegment"
                    label={t("save_for_team")}
                    checked={isTeamSegment}
                    onCheckedChange={setIsTeamSegment}
                    labelOnLeading
                  />
                </div>

                {isTeamSegment && teams && teams.length > 0 && (
                  <div className="mt-1.5">
                    <Select<{ value: string; label: string }>
                      options={teams.map((team) => ({
                        value: team.id.toString(),
                        label: team.name,
                      }))}
                      onChange={(option) => setSelectedTeamId(parseInt(option?.value || "0"))}
                      placeholder={t("select_team")}
                      data-testid="save-filter-segment-team-select"
                      required
                    />
                  </div>
                )}
              </>
            )}

            <DialogFooter>
              <Button type="button" color="minimal" onClick={() => setIsOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit">{t("save")}</Button>
            </DialogFooter>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
