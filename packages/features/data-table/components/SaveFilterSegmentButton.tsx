import * as RadioGroup from "@radix-ui/react-radio-group";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
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
  showToast,
} from "@calcom/ui";

import { useDataTable } from "../hooks";

interface SaveFilterSegmentButtonProps {
  tableIdentifier: string;
  selectedSegmentId?: number;
}

interface FormValues {
  name: string;
  scope: FilterSegmentScope;
  teamId?: number;
}

export function SaveFilterSegmentButton({
  tableIdentifier,
  selectedSegmentId,
}: SaveFilterSegmentButtonProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [isOpen, setIsOpen] = useState(false);
  const [isTeamSegment, setIsTeamSegment] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<number>();
  const [saveMode, setSaveMode] = useState<"create" | "update">("create");
  const session = useSession();
  const orgRole = session?.data?.user?.org?.role;
  const isAdminOrOwner = orgRole === MembershipRole.OWNER || orgRole === MembershipRole.ADMIN;

  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      scope: "USER",
    },
  });

  const { activeFilters, sorting, columnVisibility, columnSizing } = useDataTable();

  const { data: teams } = trpc.viewer.teams.list.useQuery();
  const { data: segments } = trpc.viewer.filterSegments.list.useQuery({ tableIdentifier });
  const selectedSegment = useMemo(() => {
    return segments?.find((segment) => segment.id === selectedSegmentId);
  }, [segments, selectedSegmentId]);

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
      setSaveMode("create");
      form.reset();
    }
  }, [isOpen, form]);

  const onSubmit = (values: FormValues) => {
    if (isTeamSegment && !selectedTeamId) {
      showToast(t("please_select_team"), "error");
      return;
    }

    const segmentData = {
      name: values.name,
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
        <Button StartIcon="bookmark" color="secondary">
          {t("save")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader title={t("save_segment")} />
        <Form form={form} handleSubmit={onSubmit}>
          {selectedSegment ? (
            <div className="mb-4">
              <RadioGroup.Root
                defaultValue="create"
                onValueChange={(value: string) => setSaveMode(value as "create" | "update")}
                className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroup.Item
                    value="update"
                    id="update"
                    className="h-4 w-4 rounded-full border border-gray-300 hover:border-gray-400">
                    <RadioGroup.Indicator className="relative flex h-full w-full items-center justify-center after:block after:h-2 after:w-2 after:rounded-full after:bg-black" />
                  </RadioGroup.Item>
                  <Label htmlFor="update">{t("override_segment", { name: selectedSegment.name })}</Label>
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

          <div>
            <div>
              <Label>{t("name")}</Label>
              <Input {...form.register("name")} required />
            </div>

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
