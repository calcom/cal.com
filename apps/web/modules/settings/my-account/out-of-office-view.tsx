"use client";

import { useEffect, useMemo, useState } from "react";

import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { InfoIcon } from "@coss/ui/icons";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogHeader } from "@calcom/ui/components/dialog";
import { Input, Label, Select } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";

import type { BookingRedirectForm } from "~/settings/outOfOffice/types";

import { CreateOrEditOutOfOfficeEntryModal } from "~/settings/outOfOffice/CreateOrEditOutOfOfficeModal";
import OutOfOfficeEntriesList from "~/settings/outOfOffice/OutOfOfficeEntriesList";
import { OutOfOfficeTab } from "~/settings/outOfOffice/OutOfOfficeToggleGroup";

import { HolidaysView } from "./holidays-view";

const CUSTOM_REASON_EMOJI_OPTIONS = [
  { value: "🤝", label: "🤝" },
  { value: "🎯", label: "🎯" },
  { value: "🏢", label: "🏢" },
  { value: "📊", label: "📊" },
  { value: "ℹ️", label: "ℹ️" },
  { value: "🩺", label: "🩺" },
] as const;

export default function OutOfOfficeView() {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [openModal, setOpenModal] = useState(false);
  const [currentlyEditingOutOfOfficeEntry, setCurrentlyEditingOutOfOfficeEntry] =
    useState<BookingRedirectForm | null>(null);
  const [customReasonFormOpen, setCustomReasonFormOpen] = useState(false);
  const [newCustomReason, setNewCustomReason] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState<string>("🤝");

  const params = useCompatSearchParams();
  const openModalOnStart = !!params?.get("om");
  const selectedTab = params?.get("type") ?? OutOfOfficeTab.MINE;

  const { data: reasonList } = trpc.viewer.ooo.outOfOfficeReasonList.useQuery();
  const { data: reasonIdsInUseList } = (
    trpc.viewer.ooo as typeof trpc.viewer.ooo & {
      outOfOfficeReasonIdsInUse: { useQuery: () => { data?: number[] } };
    }
  ).outOfOfficeReasonIdsInUse.useQuery();
  const customReasons = (reasonList || []).filter((r) => r.userId != null);
  const reasonIdsInUse = useMemo(
    () => new Set(reasonIdsInUseList ?? []),
    [reasonIdsInUseList]
  );

  const createCustomReason = (
    trpc.viewer.ooo as unknown as {
      outOfOfficeCustomReasonCreate: {
        useMutation: (opts: object) => {
          mutate: (v: { emoji: string; reason: string }) => void;
          isPending: boolean;
        };
      };
    }
  ).outOfOfficeCustomReasonCreate.useMutation({
    onSuccess: () => {
      utils.viewer.ooo.outOfOfficeReasonList.invalidate();
      setNewCustomReason("");
      setCustomReasonFormOpen(false);
      showToast(t("success"), "success");
    },
    onError: (error: { message: string }) => {
      showToast(t(error.message), "error");
    },
  });

  const deleteCustomReason = (
    trpc.viewer.ooo as unknown as {
      outOfOfficeCustomReasonDelete: {
        useMutation: (opts: object) => { mutate: (v: { id: number }) => void; isPending: boolean };
      };
    }
  ).outOfOfficeCustomReasonDelete.useMutation({
    onSuccess: () => {
      utils.viewer.ooo.outOfOfficeReasonList.invalidate();
    },
    onError: (error: { message: string }) => {
      showToast(t(error.message), "error");
    },
  });

  useEffect(() => {
    if (openModalOnStart) {
      setOpenModal(true);
    }
  }, [openModalOnStart]);

  const handleOpenCreateDialog = () => {
    setCurrentlyEditingOutOfOfficeEntry(null);
    setOpenModal(true);
  };

  const handleOpenEditDialog = (entry: BookingRedirectForm) => {
    setCurrentlyEditingOutOfOfficeEntry(entry);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setCurrentlyEditingOutOfOfficeEntry(null);
  };

  const handleAddCustomReason = () => {
    const reason = newCustomReason?.trim();
    if (!reason) {
      showToast(t("required"), "error");
      return;
    }
    createCustomReason.mutate({ emoji: selectedEmoji, reason });
  };

  const openCustomReasonForm = () => {
    setNewCustomReason("");
    setSelectedEmoji("🤝");
    setCustomReasonFormOpen(true);
  };

  // Show HolidaysView when holidays tab is selected
  if (selectedTab === OutOfOfficeTab.HOLIDAYS) {
    return <HolidaysView />;
  }

  return (
    <>
      {/* Custom OOO reason: card with button on main page */}
      <div className="border-subtle bg-muted/30 mb-6 rounded-xl border p-5 shadow-sm">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex h-8 items-center gap-1.5">
              <span className="text-emphasis text-sm font-semibold">{t("ooo_add_custom_reason")}</span>
              <Tooltip
                side="top"
                content={t("ooo_custom_reasons_hint")}
                className="max-w-sm font-normal">
                <span aria-label={t("ooo_custom_reasons_hint")}>
                  <InfoIcon className="text-subtle h-4 w-4" />
                </span>
              </Tooltip>
            </div>
            <div className="flex h-8 items-center">
              <Button
                type="button"
                color="secondary"
                size="sm"
                className="m-0 h-8 w-fit shrink-0"
                onClick={openCustomReasonForm}
                data-testid="save-custom-reason-button">
                {t("add")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: form (emoji + reason) + list of custom reasons with delete */}
      <Dialog open={customReasonFormOpen} onOpenChange={setCustomReasonFormOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-visible sm:max-w-md">
          <DialogHeader
            title={t("ooo_save_your_custom_reason")}
            subtitle={t("ooo_custom_reason_form_description")}
          />
          <form
            className="shrink-0"
            onSubmit={(e) => {
              e.preventDefault();
              handleAddCustomReason();
            }}>
            <div className="bg-muted/20 border-subtle rounded-lg border p-4">
              {/* Labels row: aligned on same baseline */}
              <div className="flex gap-3">
                <div className="flex h-5 w-14 shrink-0 items-center">
                  <Label className="text-emphasis text-xs font-medium">
                    {t("emoji")}
                    <span className="text-default ml-0.5">*</span>
                  </Label>
                </div>
                <div className="flex h-5 min-w-[120px] flex-1 items-center">
                  <Label className="text-emphasis text-xs font-medium">
                    {t("reason")}
                    <span className="text-default ml-0.5">*</span>
                  </Label>
                </div>
              </div>
              {/* Inputs row */}
              <div className="mt-1.5 flex flex-wrap gap-3">
                <div className="w-14 shrink-0">
                  <Select<{ value: string; label: string }>
                    className="border-subtle w-full rounded-md"
                    value={CUSTOM_REASON_EMOJI_OPTIONS.find((o) => o.value === selectedEmoji) ?? null}
                    options={[...CUSTOM_REASON_EMOJI_OPTIONS]}
                    onChange={(option) => option && setSelectedEmoji(option.value)}
                    placeholder=""
                    menuPlacement="auto"
                  />
                </div>
                <div className="min-w-[120px] flex-1">
                  <Input
                    className="border-subtle w-full rounded-md border px-3 py-2"
                    placeholder={t("e_g_client_visit")}
                    value={newCustomReason}
                    onChange={(e) => setNewCustomReason(e.target.value)}
                    maxLength={50}
                    required
                    data-testid="custom-reason-input"
                  />
                  <p className="text-muted mt-1 text-xs">{t("max_characters_allowed", { count: 50 })}</p>
                </div>
              </div>
            </div>
            <div className="mt-6 mb-6 flex justify-end gap-2">
              <Button type="button" color="secondary" onClick={() => setCustomReasonFormOpen(false)}>
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={!newCustomReason?.trim() || createCustomReason.isPending}
                data-testid="custom-reason-save">
                {createCustomReason.isPending ? t("saving") : t("save")}
              </Button>
            </div>
          </form>

          {/* Saved custom reasons list: only this section scrolls so the emoji dropdown is not clipped */}
          {customReasons.length > 0 && (
            <div className="border-subtle mb-6 mt-5 min-h-0 flex-1 border-t pt-5 pb-1">
              <p className="text-emphasis mb-3 text-sm font-medium">{t("custom_reasons")}</p>
              <ul className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                {customReasons.map((r) => {
                  const isReasonInUse = reasonIdsInUse.has(r.id);
                  return (
                    <li
                      key={r.id}
                      className="hover:bg-muted/50 border-subtle flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors">
                      <span className="text-emphasis min-w-0 truncate">
                        <span className="mr-2 text-base" aria-hidden>
                          {r.emoji}
                        </span>
                        {r.reason}
                      </span>
                      <Tooltip
                        content={isReasonInUse ? t("custom_reason_in_use") : t("delete")}
                        side="left">
                        <span className="inline-flex">
                          <Button
                            type="button"
                            color="destructive"
                            variant="icon"
                            size="sm"
                            className="shrink-0"
                            StartIcon="trash-2"
                            onClick={() => !isReasonInUse && deleteCustomReason.mutate({ id: r.id })}
                            disabled={deleteCustomReason.isPending || isReasonInUse}
                            aria-label={t("delete")}
                          />
                        </span>
                      </Tooltip>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <OutOfOfficeEntriesList
        onOpenCreateDialog={handleOpenCreateDialog}
        onOpenEditDialog={handleOpenEditDialog}
      />
      {openModal && (
        <CreateOrEditOutOfOfficeEntryModal
          openModal={openModal}
          closeModal={handleCloseModal}
          currentlyEditingOutOfOfficeEntry={currentlyEditingOutOfOfficeEntry}
        />
      )}
    </>
  );
}
