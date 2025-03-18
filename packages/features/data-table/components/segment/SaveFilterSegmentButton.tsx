import * as RadioGroup from "@radix-ui/react-radio-group";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole, type FilterSegmentScope } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
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
  Select,
  Switch,
  RadioField,
  showToast,
} from "@calcom/ui";

import { useDataTable } from "../../hooks";

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
  const orgRole = session?.data?.user?.org?.role;
  const isAdminOrOwner = orgRole === MembershipRole.OWNER || orgRole === MembershipRole.ADMIN;

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
  } = useDataTable();

  const [saveMode, setSaveMode] = useState<"create" | "update">(() =>
    selectedSegment ? "update" : "create"
  );

  const { data: teams } = trpc.viewer.teams.list.useQuery();

  const { mutate: createSegment } = trpc.viewer.filterSegments.create.useMutation({
    onSuccess: () => {
      utils.viewer.filterSegments.list.invalidate();
      showToast(t("filter_segment_created"), "success");
      setIsOpen(false);
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
    },
    onError: () => {
      showToast(t("error_updating_filter_segment"), "error");
    },
  });

  useEffect(() => {
    if (!isOpen) {
      setIsTeamSegment(false);
      setSelectedTeamId(undefined);
      setSaveMode(selectedSegment ? "update" : "create");
      form.reset();
    }
  }, [isOpen, form, selectedSegment]);

  const onSubmit = (values: FormValues) => {
    if (isTeamSegment && !selectedTeamId) {
      showToast(t("please_select_team"), "error");
      return;
    }

    const segmentData = {
      name: saveMode === "update" && selectedSegment ? selectedSegment.name : values.name,
      tableIdentifier,
      activeFilters,
      sorting,
      columnVisibility,
      columnSizing,
      perPage: 10,
    };

    if (saveMode === "update" && selectedSegment) {
      const scope = selectedSegment.scope;
      if (scope === "TEAM") {
        updateSegment({
          id: selectedSegment.id,
          scope,
          teamId: selectedSegment.teamId || 0,
          ...segmentData,
        });
      } else {
        updateSegment({
          id: selectedSegment.id,
          scope,
          ...segmentData,
        });
      }
    } else {
      if (isTeamSegment) {
        createSegment({
          ...segmentData,
          scope: "TEAM",
          teamId: selectedTeamId || 0,
        });
      } else {
        createSegment({
          ...segmentData,
          scope: "USER",
        });
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button StartIcon="bookmark" color="secondary" disabled={!canSaveSegment}>
          {t("save")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader title={t("save_segment")} />
        <Form form={form} handleSubmit={onSubmit}>
          {selectedSegment ? (
            <div className="mb-4">
              <RadioGroup.Root
                defaultValue="update"
                onValueChange={(value: string) => setSaveMode(value as "create" | "update")}
                className="space-y-2">
                <RadioField
                  id="update_segment"
                  label={t("override_segment", { name: selectedSegment.name })}
                  value="update"
                />
                <RadioField id="create_segment" label={t("create_new_segment")} value="create" />
              </RadioGroup.Root>
            </div>
          ) : null}

          <div>
            {saveMode === "create" && (
              <div>
                <Label>{t("name")}</Label>
                <Input {...form.register("name")} required />
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
                  <div>
                    <Select<{ value: string; label: string }>
                      options={teams.map((team) => ({
                        value: team.id.toString(),
                        label: team.name,
                      }))}
                      onChange={(option) => setSelectedTeamId(parseInt(option?.value || "0"))}
                      placeholder={t("select_team")}
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
