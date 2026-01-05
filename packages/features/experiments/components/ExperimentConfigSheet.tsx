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

  useEffect(() => {
    if (open && metadata) {
      setVariants(metadata.variants || []);
      setAssignmentType(metadata.assignmentType || "DETERMINISTIC");
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
          <div>
            <label className="text-emphasis mb-2 block text-sm font-medium">Assignment Type</label>
            <Select
              value={assignmentType}
              onValueChange={(value: "DETERMINISTIC" | "RANDOM") => setAssignmentType(value)}>
              <option value="DETERMINISTIC">Deterministic (hash-based)</option>
              <option value="RANDOM">Random</option>
            </Select>
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
