"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Select, TextField } from "@calcom/ui/components/form";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@calcom/ui/components/sheet";
import { showToast } from "@calcom/ui/components/toast";
import { useEffect, useState } from "react";

import type { ExperimentMetadata, ExperimentVariantConfig } from "../types";
import { ExperimentStats } from "./ExperimentStats";

type Experiment = RouterOutputs["viewer"]["features"]["list"][number];

interface ExperimentConfigSheetProps {
  experiment: Experiment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExperimentConfigSheet({ experiment, open, onOpenChange }: ExperimentConfigSheetProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const metadata = experiment.metadata as unknown as ExperimentMetadata;
  const [variants, setVariants] = useState<ExperimentVariantConfig[]>(
    metadata?.variants || [
      { name: "control", percentage: 50 },
      { name: "treatment", percentage: 50 },
    ]
  );
  const [assignmentType, setAssignmentType] = useState<"DETERMINISTIC" | "RANDOM">(
    metadata?.assignmentType || "DETERMINISTIC"
  );
  const [status, setStatus] = useState<"draft" | "running" | "paused" | "concluded">(
    metadata?.status || "draft"
  );
  const [winnerVariant, setWinnerVariant] = useState<string>(metadata?.winnerVariant || "");

  useEffect(() => {
    if (open && metadata) {
      setVariants(metadata.variants || []);
      setAssignmentType(metadata.assignmentType || "DETERMINISTIC");
      setStatus(metadata.status || "draft");
      setWinnerVariant(metadata.winnerVariant || "");
    }
  }, [open, metadata]);

  const updateMutation = trpc.viewer.admin.updateExperimentConfig.useMutation({
    onSuccess: () => {
      showToast("Experiment updated successfully", "success");
      utils.viewer.features.list.invalidate();
      onOpenChange(false);
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  const migrateMutation = trpc.viewer.admin.migrateExperimentToWinner.useMutation({
    onSuccess: (data) => {
      showToast(data.message, "success");
      utils.viewer.features.list.invalidate();
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  const handleSave = () => {
    const totalPercentage = variants.reduce((sum, v) => sum + v.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      showToast("Variant percentages must sum to 100%", "error");
      return;
    }

    updateMutation.mutate({
      slug: experiment.slug,
      metadata: {
        variants,
        assignmentType,
        status,
        ...(status === "concluded" && winnerVariant && { winnerVariant }),
      },
    });
  };

  const addVariant = () => {
    setVariants([...variants, { name: "", percentage: 0 }]);
  };

  const removeVariant = (index: number) => {
    if (variants.length <= 2) {
      showToast("Must have at least 2 variants", "error");
      return;
    }
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: "name" | "percentage", value: string | number) => {
    const updated = [...variants];
    if (field === "name") {
      updated[index].name = value as string;
    } else {
      updated[index].percentage = Number(value);
    }
    setVariants(updated);
  };

  const totalPercentage = variants.reduce((sum, v) => sum + v.percentage, 0);
  const isValid = Math.abs(totalPercentage - 100) < 0.01;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-cal-muted">
        <SheetHeader>
          <SheetTitle>Configure Experiment: {experiment.slug}</SheetTitle>
        </SheetHeader>
        <SheetBody className="space-y-4">
          <ExperimentStats experimentSlug={experiment.slug} />

          <div>
            <label className="text-emphasis mb-2 block text-sm font-medium">Status</label>
            <Select<{ label: string; value: "draft" | "running" | "paused" | "concluded" }>
              value={
                status === "draft"
                  ? { label: "Draft", value: "draft" }
                  : status === "running"
                    ? { label: "Running", value: "running" }
                    : status === "paused"
                      ? { label: "Paused", value: "paused" }
                      : { label: "Concluded", value: "concluded" }
              }
              options={[
                { label: "Draft", value: "draft" },
                { label: "Running", value: "running" },
                { label: "Paused", value: "paused" },
                { label: "Concluded", value: "concluded" },
              ]}
              onChange={(option) => option && setStatus(option.value)}
            />
            <p className="text-subtle mt-1 text-xs">
              {status === "draft" && "Experiment is being configured"}
              {status === "running" && "Experiment is active and assigning variants"}
              {status === "paused" && "Experiment is temporarily paused - no new assignments"}
              {status === "concluded" &&
                "Experiment has ended - all users will receive the winner variant if set"}
            </p>
          </div>

          <div>
            <label className="text-emphasis mb-2 block text-sm font-medium">Assignment Type</label>
            <Select<{ label: string; value: "DETERMINISTIC" | "RANDOM" }>
              value={
                assignmentType === "DETERMINISTIC"
                  ? { label: "Deterministic (hash-based)", value: "DETERMINISTIC" }
                  : { label: "Random", value: "RANDOM" }
              }
              options={[
                { label: "Deterministic (hash-based)", value: "DETERMINISTIC" },
                { label: "Random", value: "RANDOM" },
              ]}
              onChange={(option) => option && setAssignmentType(option.value)}
            />
            <p className="text-subtle mt-1 text-xs">
              {assignmentType === "DETERMINISTIC"
                ? "Users get the same variant every time (recommended)"
                : "Users get a random variant on each assignment"}
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-emphasis text-sm font-medium">
                Variants
                {!isValid && (
                  <span className="text-destructive ml-2 text-xs">
                    (Total: {totalPercentage.toFixed(1)}% - must be 100%)
                  </span>
                )}
                {isValid && <span className="text-success ml-2 text-xs">(Total: 100% ✓)</span>}
              </label>
              <Button size="sm" color="secondary" onClick={addVariant}>
                Add Variant
              </Button>
            </div>

            <div className="space-y-2">
              {variants.map((variant, index) => (
                <div key={index} className="bg-default flex items-center gap-2 rounded-md border p-3">
                  <TextField
                    value={variant.name}
                    onChange={(e) => updateVariant(index, "name", e.target.value)}
                    placeholder="Variant name"
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1">
                    <TextField
                      type="number"
                      value={variant.percentage}
                      onChange={(e) => updateVariant(index, "percentage", e.target.value)}
                      placeholder="%"
                      className="w-20"
                      min={0}
                      max={100}
                      step={0.1}
                    />
                    <span className="text-subtle text-sm">%</span>
                  </div>
                  {variants.length > 2 && (
                    <Button
                      size="sm"
                      color="destructive"
                      variant="icon"
                      StartIcon="trash"
                      onClick={() => removeVariant(index)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {status === "concluded" && (
            <div className="space-y-3">
              <div>
                <label className="text-emphasis mb-2 block text-sm font-medium">Winner Variant</label>
                <Select<{ label: string; value: string }>
                  value={winnerVariant ? { label: winnerVariant, value: winnerVariant } : undefined}
                  options={variants.map((v) => ({ label: v.name, value: v.name }))}
                  onChange={(option) => option && setWinnerVariant(option.value)}
                  placeholder="Select winning variant (optional)"
                  isClearable
                />
                <p className="text-subtle mt-1 text-xs">Mark which variant won the experiment</p>
              </div>

              {metadata?.winnerVariant && (
                <div className="bg-muted rounded-md border p-3">
                  <p className="text-emphasis mb-2 text-sm font-medium">Migrate all users to winner variant</p>
                  <p className="text-subtle mb-3 text-xs">
                    This will update all existing assignments to use the &quot;{metadata.winnerVariant}&quot;
                    variant. New users will automatically get this variant.
                  </p>
                  <Button
                    color="primary"
                    size="sm"
                    onClick={() =>
                      migrateMutation.mutate({
                        experimentSlug: experiment.slug,
                        winnerVariant: metadata.winnerVariant!,
                      })
                    }
                    loading={migrateMutation.isPending}>
                    Migrate All Users to {metadata.winnerVariant}
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetBody>
        <SheetFooter>
          <Button color="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={updateMutation.isPending} disabled={!isValid}>
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
