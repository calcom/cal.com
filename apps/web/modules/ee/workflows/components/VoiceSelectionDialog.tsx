import { getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { usePathname } from "next/navigation";
import { useMemo, useState, useCallback } from "react";

import { DataTableProvider } from "@calcom/features/data-table";
import { DataTableWrapper } from "~/data-table/components";
import { useSegments } from "@calcom/features/data-table/hooks/useSegments";
import { useVoicePreview } from "@calcom/features/ee/workflows/hooks/useVoicePreview";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogHeader } from "@calcom/ui/components/dialog";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

type Voice = {
  voice_id: string;
  voice_name: string;
  provider: "elevenlabs" | "openai" | "deepgram";
  gender: "male" | "female";
  accent?: string;
  age?: string;
  preview_audio_url?: string;
};

type VoiceSelectionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedVoiceId?: string;
  onVoiceSelect: (voiceId: string) => void;
};

function VoiceSelectionTable({
  selectedVoiceId,
  onVoiceSelect,
}: {
  selectedVoiceId?: string;
  onVoiceSelect: (voiceId: string) => void;
}) {
  const pathname = usePathname();
  if (!pathname) return null;
  return (
    <DataTableProvider tableIdentifier={pathname} useSegments={useSegments} defaultPageSize={1000}>
      <VoiceSelectionContent selectedVoiceId={selectedVoiceId} onVoiceSelect={onVoiceSelect} />
    </DataTableProvider>
  );
}

function VoiceSelectionContent({
  selectedVoiceId,
  onVoiceSelect,
}: {
  selectedVoiceId?: string;
  onVoiceSelect: (voiceId: string) => void;
}) {
  const { t } = useLocale();
  const { playingVoiceId, handlePlayVoice } = useVoicePreview();
  const [rowSelection, setRowSelection] = useState({});

  const { data: voices, isLoading } = trpc.viewer.aiVoiceAgent.listVoices.useQuery();

  const handleUseVoice = useCallback(
    (voiceId: string) => {
      onVoiceSelect(voiceId);
      showToast("Voice selected successfully", "success");
    },
    [onVoiceSelect]
  );

  const voiceData: Voice[] = useMemo(() => {
    if (!voices) return [];
    return voices;
  }, [voices]);

  const columns = useMemo<ColumnDef<Voice>[]>(
    () => [
      {
        id: "voice",
        accessorKey: "voice_name",
        header: t("voice"),
        size: 200,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="icon"
              color="secondary"
              size="sm"
              onClick={() => handlePlayVoice(row.original.preview_audio_url, row.original.voice_id)}
              className="rounded-full">
              {playingVoiceId === row.original.voice_id ? (
                <Icon name="pause" className="text-default h-3 w-3" />
              ) : (
                <Icon name="play" className="text-default h-3 w-3" />
              )}
            </Button>
            <div className="flex items-center gap-2">
              <div className="bg-subtle flex h-10 w-10 items-center justify-center rounded-full">
                <Icon name="user" className="text-default h-5 w-5" />
              </div>
              <span className="text-emphasis font-medium">{row.original.voice_name}</span>
            </div>
          </div>
        ),
      },
      {
        id: "trait",
        accessorKey: "accent",
        header: t("trait"),
        size: 200,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2 text-sm sm:flex-nowrap">
            {row.original.accent && (
              <span className="bg-subtle text-default rounded-md px-2 py-1 text-xs">
                {row.original.accent}
              </span>
            )}
            {row.original.gender && (
              <span className="bg-subtle text-default rounded-md px-2 py-1 text-xs">
                {row.original.gender}
              </span>
            )}
            {row.original.provider && (
              <span className="bg-subtle text-default rounded-md px-2 py-1 text-xs">
                {row.original.provider}
              </span>
            )}
            {row.original.age && (
              <span className="bg-subtle text-default rounded-md px-2 py-1 text-xs">{row.original.age}</span>
            )}
          </div>
        ),
      },
      {
        id: "voice_id",
        accessorKey: "voice_id",
        header: t("voice_id"),
        size: 200,
        cell: ({ row }) => <span className="text-muted font-mono text-sm">{row.original.voice_id}</span>,
      },
      {
        id: "actions",
        header: "",
        size: 120,
        cell: ({ row }) => (
          <Button
            type="button"
            size="sm"
            color={selectedVoiceId === row.original.voice_id ? "primary" : "secondary"}
            onClick={() => handleUseVoice(row.original.voice_id)}
            className="whitespace-nowrap">
            {selectedVoiceId === row.original.voice_id ? t("current_voice") : t("use_voice")}
          </Button>
        ),
      },
    ],
    [t, playingVoiceId, selectedVoiceId, handlePlayVoice, handleUseVoice]
  );

  const table = useReactTable({
    data: voiceData,
    columns,
    enableRowSelection: false,
    manualPagination: false,
    state: {
      rowSelection,
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.voice_id,
  });

  return (
    <div className="border-subtle max-h-[500px] overflow-auto rounded-lg border">
      <DataTableWrapper<Voice>
        testId="voice-selection-data-table"
        table={table}
        isPending={isLoading}
        totalRowCount={voiceData?.length || 0}
        paginationMode="standard"
        className="h-auto"
      />
    </div>
  );
}

export function VoiceSelectionDialog({
  open,
  onOpenChange,
  selectedVoiceId,
  onVoiceSelect,
}: VoiceSelectionDialogProps) {
  const { t } = useLocale();

  const handleVoiceSelect = (voiceId: string) => {
    onVoiceSelect(voiceId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent enableOverflow size="md" className="flex flex-col p-6 sm:max-w-7xl">
        <DialogHeader title={t("select_voice")} subtitle={t("choose_a_voice_for_your_agent")} />

        <div className="mt-4 min-h-0 flex-1 overflow-hidden">
          <VoiceSelectionTable selectedVoiceId={selectedVoiceId} onVoiceSelect={handleVoiceSelect} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
