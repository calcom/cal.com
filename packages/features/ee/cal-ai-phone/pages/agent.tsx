"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";

import PhoneInput from "@calcom/features/components/phone-input";
import Shell from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { TextField, TextAreaField, Label, Select } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

import LicenseRequired from "../../common/components/LicenseRequired";

const TOOL_TYPES = [
  {
    label: "Check Availability",
    value: "check_availability_cal",
  },
  {
    label: "Book Appointment",
    value: "book_appointment_cal",
  },
  {
    label: "End Call",
    value: "end_call",
  },
];

const agentSchema = z.object({
  generalPrompt: z.string().min(1, "General prompt is required"),
  beginMessage: z.string().min(1, "Begin message is required"),
  numberToCall: z.string().optional(),
  generalTools: z
    .array(
      z.object({
        type: z.string(),
        name: z.string(),
        description: z.string().nullish().default(null),
        cal_api_key: z.string().nullish().default(null),
        event_type_id: z.number().nullish().default(null),
        timezone: z.string().nullish().default(null),
      })
    )
    .optional(),
});

type AgentFormValues = z.infer<typeof agentSchema>;

type PageProps = {
  agentId: string;
};

function AgentPage({ agentId }: PageProps) {
  const { t } = useLocale();
  const session = useSession();

  const { data: agentData, isPending, refetch } = trpc.viewer.ai.get.useQuery({ id: agentId });
  const updateAgent = trpc.viewer.ai.update.useMutation();
  const testCall = trpc.viewer.ai.testCall.useMutation();

  const [toolDialogOpen, setToolDialogOpen] = useState(false);
  const [editingToolIndex, setEditingToolIndex] = useState<number | null>(null);
  const [toolDraft, setToolDraft] = useState<any>(null);

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      generalPrompt: "",
      beginMessage: "",
      numberToCall: "",
      generalTools: [],
    },
  });

  useEffect(() => {
    if (agentData) {
      const retell = (agentData.retellData as any) || {};
      form.reset({
        generalPrompt: retell.general_prompt || "",
        beginMessage: retell.begin_message || "",
        numberToCall: "",
        generalTools: retell.general_tools || [],
      });
    }
  }, [agentData]);

  const onSubmit = async (values: AgentFormValues) => {
    try {
      const res = await updateAgent.mutateAsync({
        id: agentId,
        generalPrompt: values.generalPrompt,
        beginMessage: values.beginMessage,
        generalTools: values.generalTools,
      });
      console.log("update agent res", res);
      showToast(t("Agent updated successfully"), "success");
      refetch();
    } catch (e: any) {
      showToast(e.message || t("Something went wrong"), "error");
    }
  };

  const onTestCall = async () => {
    const values = form.getValues();
    if (!values.numberToCall) {
      showToast(t("Please enter a number to call"), "error");
      return;
    }
    try {
      const res = await testCall.mutateAsync({
        agentId,
        phoneNumber: values.numberToCall,
      });
      showToast(res.message || t("Call initiated!"), "success");
    } catch (e: any) {
      showToast(e.message || t("Something went wrong"), "error");
    }
  };

  // General Tools Handlers
  const openAddToolDialog = () => {
    setEditingToolIndex(null);
    setToolDraft({
      type: TOOL_TYPES[0].value,
      name: "",
      description: "",
      cal_api_key: null,
      event_type_id: null,
      timezone: "",
    });
    setToolDialogOpen(true);
  };
  const openEditToolDialog = (idx: number) => {
    const tools = form.getValues("generalTools") || [];
    const tool = tools[idx];
    if (tool && idx >= 0 && idx < tools.length) {
      setEditingToolIndex(idx);
      setToolDraft({ ...tool });
      setToolDialogOpen(true);
    }
  };
  const handleToolDialogSave = () => {
    if (!toolDraft.name || !toolDraft.type) return;

    if (toolDraft.type === "check_availability_cal" || toolDraft.type === "book_appointment_cal") {
      if (!toolDraft.cal_api_key) {
        showToast(t("API Key is required for Cal.com tools"), "error");
        return;
      }
      if (!toolDraft.event_type_id) {
        showToast(t("Event Type ID is required for Cal.com tools"), "error");
        return;
      }
      if (!toolDraft.timezone) {
        showToast(t("Timezone is required for Cal.com tools"), "error");
        return;
      }
    }

    const tools = form.getValues("generalTools") || [];
    if (editingToolIndex !== null) {
      tools[editingToolIndex] = toolDraft;
    } else {
      tools.push(toolDraft);
    }
    form.setValue("generalTools", tools, { shouldDirty: true, shouldTouch: true });
    setToolDialogOpen(false);
    setToolDraft(null);
    setEditingToolIndex(null);
  };
  const handleToolDelete = (idx: number) => {
    const tools = form.getValues("generalTools") || [];
    tools.splice(idx, 1);
    form.setValue("generalTools", tools, { shouldDirty: true, shouldTouch: true });
  };

  console.log("formafsdf", form.watch());
  console.log("form.formState.isDirty", form.formState);

  if (!session.data) return null;

  return (
    <Shell withoutMain backPath="/agents">
      <LicenseRequired>
        <div className="mx-auto max-w-6xl">
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="font-cal text-emphasis text-2xl font-semibold tracking-wide">{t("Edit Agent")}</h1>
            <p className="text-subtle mt-2 text-sm">
              {t("Configure your AI phone agent's behavior, capabilities, and settings")}
            </p>
          </div>

          {isPending ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Icon name="loader" className="text-muted mx-auto h-8 w-8 animate-spin" />
                <p className="text-subtle mt-2 text-sm">{t("Loading agent configuration...")}</p>
              </div>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="bg-default border-subtle rounded-lg border">
                <div className="space-y-6 p-6">
                  <TextAreaField
                    required
                    label={t("General Prompt")}
                    {...form.register("generalPrompt")}
                    placeholder={t("Enter the general prompt for the agent")}
                    className="min-h-[500px]"
                    hint={t("This prompt defines the agent's role and primary objectives")}
                  />

                  <TextField
                    required
                    label={t("Begin Message")}
                    {...form.register("beginMessage")}
                    placeholder={t("Enter the begin message")}
                    hint={t("The first message the agent will say when starting a call")}
                  />

                  <div className="border-subtle bg-muted rounded-lg border p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-emphasis text-base font-medium">{t("Test Your Agent")}</h3>
                        <p className="text-subtle text-sm">
                          {t("Make a test call to verify your agent's configuration")}
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={onTestCall}
                        loading={testCall.isPending}
                        color="secondary"
                        StartIcon="phone"
                        disabled={!form.watch("numberToCall")}>
                        {t("Make Test Call")}
                      </Button>
                    </div>
                    <div>
                      <Label className="text-emphasis mb-2 block text-sm font-medium">
                        {t("Phone Number to Call")}
                      </Label>
                      <Controller
                        name="numberToCall"
                        control={form.control}
                        render={({ field: { onChange, value } }) => (
                          <PhoneInput
                            placeholder={t("Enter phone number to test call")}
                            id="numberToCall"
                            name="numberToCall"
                            value={value ?? ""}
                            onChange={(val) => {
                              onChange(val);
                            }}
                          />
                        )}
                      />
                      <p className="text-subtle mt-2 text-sm">
                        {t("Enter a phone number to test your agent configuration")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Functions Section */}
              <div className="bg-default border-subtle rounded-lg border">
                <div className="border-subtle border-b px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-emphasis text-lg font-semibold">{t("Functions")}</h2>
                      <p className="text-subtle mt-1 text-sm">
                        {t(
                          "Enable your agent with capabilities such as calendar bookings, call termination, etc."
                        )}
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={openAddToolDialog}
                      color="secondary"
                      size="sm"
                      StartIcon="plus">
                      {t("Add Function")}
                    </Button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {(form.watch("generalTools") || []).map((tool, idx) => (
                      <div
                        key={idx}
                        className="border-subtle bg-muted hover:bg-default flex items-center justify-between rounded-lg border p-4 transition-colors">
                        <div className="flex gap-3">
                          <div className="bg-default border-subtle flex h-8 w-8 items-center justify-center rounded-md border">
                            <Icon name="zap" className="text-emphasis h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-emphasis font-medium">{tool.name}</p>
                            <p className="text-subtle text-sm">
                              {TOOL_TYPES.find((t) => t.value === tool.type)?.label || tool.type}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            color="secondary"
                            variant="icon"
                            onClick={() => openEditToolDialog(idx)}
                            data-testid="edit-button">
                            <Icon name="pencil" className="h-5 w-5" />
                          </Button>
                          {tool.name !== "end_call" && (
                            <Button
                              type="button"
                              color="destructive"
                              variant="icon"
                              size="sm"
                              onClick={() => handleToolDelete(idx)}>
                              <Icon name="trash" className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {(form.watch("generalTools") || []).length === 0 && (
                      <div className="border-subtle bg-muted flex flex-col items-center justify-center rounded-lg border p-8 text-center">
                        <Icon name="zap" className="text-subtle h-8 w-8" />
                        <p className="text-subtle mt-2 text-sm">{t("No functions configured yet")}</p>
                        <p className="text-subtle text-xs">
                          {t("Add functions to enable advanced capabilities")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t pt-6">
                <Button type="button" color="secondary" onClick={() => window.history.back()}>
                  {t("Cancel")}
                </Button>
                <Button type="submit" loading={updateAgent.isPending} disabled={!form.formState.isDirty}>
                  {t("Update Agent")}
                </Button>
              </div>
            </form>
          )}

          <Dialog open={toolDialogOpen} onOpenChange={setToolDialogOpen}>
            <DialogContent
              enableOverflow
              title={editingToolIndex !== null ? t("Edit Function") : t("Add Function")}
              type="creation">
              <div className="flex flex-col gap-4">
                <div>
                  <Label>{t("Type")}</Label>
                  <Select
                    options={TOOL_TYPES}
                    value={TOOL_TYPES.find((opt) => opt.value === toolDraft?.type) || null}
                    onChange={(option) => setToolDraft((d: any) => ({ ...d, type: option?.value || "" }))}
                    placeholder={t("Select function type")}
                  />
                </div>
                <div>
                  <Label>{t("Name")}</Label>
                  <TextField
                    required
                    value={toolDraft?.name || ""}
                    onChange={(e) => setToolDraft((d: any) => ({ ...d, name: e.target.value }))}
                    placeholder={t("Enter function name")}
                  />
                </div>
                <div>
                  <Label>{t("Description")}</Label>
                  <TextAreaField
                    name="description"
                    value={toolDraft?.description || ""}
                    onChange={(e) => setToolDraft((d: any) => ({ ...d, description: e.target.value }))}
                    placeholder={t("Enter description (optional)")}
                  />
                </div>
                <div>
                  <Label>
                    {t("API Key (Cal.com)")}
                    {(toolDraft?.type === "check_availability_cal" ||
                      toolDraft?.type === "book_appointment_cal") && <span className="text-red-500"> *</span>}
                  </Label>
                  <TextField
                    required={
                      toolDraft?.type === "check_availability_cal" ||
                      toolDraft?.type === "book_appointment_cal"
                    }
                    value={toolDraft?.cal_api_key || ""}
                    onChange={(e) => setToolDraft((d: any) => ({ ...d, cal_api_key: e.target.value }))}
                    placeholder={t("Enter Cal.com API key")}
                  />
                </div>
                <div>
                  <Label>
                    {t("Event Type ID (Cal.com)")}
                    {(toolDraft?.type === "check_availability_cal" ||
                      toolDraft?.type === "book_appointment_cal") && <span className="text-red-500"> *</span>}
                  </Label>
                  <TextField
                    required={
                      toolDraft?.type === "check_availability_cal" ||
                      toolDraft?.type === "book_appointment_cal"
                    }
                    value={toolDraft?.event_type_id || ""}
                    onChange={(e) =>
                      setToolDraft((d: any) => ({
                        ...d,
                        event_type_id: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                    placeholder={t("Enter Event Type ID")}
                    type="number"
                  />
                </div>
                <div>
                  <Label>
                    {t("Timezone")}
                    {(toolDraft?.type === "check_availability_cal" ||
                      toolDraft?.type === "book_appointment_cal") && <span className="text-red-500"> *</span>}
                  </Label>
                  <TextField
                    required={
                      toolDraft?.type === "check_availability_cal" ||
                      toolDraft?.type === "book_appointment_cal"
                    }
                    value={toolDraft?.timezone || ""}
                    onChange={(e) => setToolDraft((d: any) => ({ ...d, timezone: e.target.value }))}
                    placeholder={t("America/Los_Angeles")}
                  />
                  {(toolDraft?.type === "check_availability_cal" ||
                    toolDraft?.type === "book_appointment_cal") && (
                    <p className="text-subtle mt-1 text-xs">
                      {t("Required for Cal.com calendar integration")}
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter showDivider>
                <Button type="button" color="secondary" onClick={() => setToolDialogOpen(false)}>
                  {t("Cancel")}
                </Button>
                <Button type="button" onClick={handleToolDialogSave}>
                  {t("Save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </LicenseRequired>
    </Shell>
  );
}

export default AgentPage;
