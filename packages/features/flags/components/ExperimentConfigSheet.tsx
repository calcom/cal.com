"use client";

import { useState, useEffect } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { TextField } from "@calcom/ui/components/form";
import { Label } from "@calcom/ui/components/form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetFooter,
} from "@calcom/ui/components/sheet";
import { showToast } from "@calcom/ui/components/toast";

type Flag = RouterOutputs["viewer"]["features"]["list"][number];

interface ExperimentConfigSheetProps {
  flag: Flag;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExperimentConfigSheet({ flag, open, onOpenChange }: ExperimentConfigSheetProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [variants, setVariants] = useState<Array<{ name: string; percentage: number }>>([]);
  const [assignmentType, setAssignmentType] = useState<"deterministic" | "random">("deterministic");

  const { data: config, isLoading } = trpc.viewer.admin.experiments.getConfig.useQuery(
    { experimentSlug: flag.slug },
    { enabled: open }
  );

  const updateMutation = trpc.viewer.admin.experiments.updateConfig.useMutation({
    onSuccess: () => {
      showToast("Experiment config updated successfully", "success");
      utils.viewer.admin.experiments.getConfig.invalidate({ experimentSlug: flag.slug });
      onOpenChange(false);
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  useEffect(() => {
    if (config) {
      setVariants(config.variants);
      setAssignmentType(config.assignmentType);
    } else {
      setVariants([
        { name: "control", percentage: 50 },
        { name: "treatment", percentage: 50 },
      ]);
      setAssignmentType("deterministic");
    }
  }, [config]);

  const handleVariantChange = (index: number, field: "name" | "percentage", value: string | number) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const handleAddVariant = () => {
    setVariants([...variants, { name: "", percentage: 0 }]);
  };

  const handleRemoveVariant = (index: number) => {
    if (variants.length > 1) {
      setVariants(variants.filter((_, i) => i !== index));
    }
  };

  const handleSave = () => {
    const totalPercentage = variants.reduce((sum, v) => sum + v.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      showToast("Percentages must sum to 100", "error");
      return;
    }

    updateMutation.mutate({
      experimentSlug: flag.slug,
      variants,
      assignmentType,
    });
  };

  const totalPercentage = variants.reduce((sum, v) => sum + v.percentage, 0);
  const isValid = Math.abs(totalPercentage - 100) < 0.01;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-muted">
        <SheetHeader>
          <SheetTitle>Experiment Config: {flag.slug}</SheetTitle>
        </SheetHeader>
        <SheetBody>
          {isLoading ? (
            <div className="text-subtle text-sm">Loading...</div>
          ) : (
            <div className="space-y-6">
              <div>
                <Label>Assignment Type</Label>
                <div className="mt-2 flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={assignmentType === "deterministic"}
                      onChange={() => setAssignmentType("deterministic")}
                    />
                    <span>Deterministic</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={assignmentType === "random"}
                      onChange={() => setAssignmentType("random")}
                    />
                    <span>Random</span>
                  </label>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label>Variants</Label>
                  <Button color="secondary" size="sm" onClick={handleAddVariant}>
                    Add Variant
                  </Button>
                </div>
                <div className="space-y-3">
                  {variants.map((variant, index) => (
                    <div key={index} className="flex gap-2">
                      <TextField
                        placeholder="Variant name"
                        value={variant.name}
                        onChange={(e) => handleVariantChange(index, "name", e.target.value)}
                        className="flex-1"
                      />
                      <TextField
                        type="number"
                        min="0"
                        max="100"
                        placeholder="%"
                        value={variant.percentage.toString()}
                        onChange={(e) =>
                          handleVariantChange(index, "percentage", parseFloat(e.target.value) || 0)
                        }
                        className="w-24"
                      />
                      <Button
                        color="destructive"
                        size="sm"
                        variant="icon"
                        onClick={() => handleRemoveVariant(index)}
                        disabled={variants.length === 1}>
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-sm">
                  <span className={isValid ? "text-default" : "text-destructive"}>
                    Total: {totalPercentage.toFixed(1)}%
                  </span>
                  {!isValid && <span className="text-destructive ml-2">Must equal 100%</span>}
                </div>
              </div>
            </div>
          )}
        </SheetBody>
        <SheetFooter>
          <Button color="secondary" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button color="primary" onClick={handleSave} disabled={!isValid || updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : t("save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
