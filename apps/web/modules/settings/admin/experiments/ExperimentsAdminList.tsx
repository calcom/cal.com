"use client";

import { CONTROL_GROUP } from "@calcom/features/experiments/config";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFooter,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@coss/ui/components/collapsible";
import { Input } from "@coss/ui/components/input";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@coss/ui/components/menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@coss/ui/components/table";
import { toastManager } from "@coss/ui/components/toast";
import { ChevronDownIcon, InfoIcon } from "lucide-react";
import { useState } from "react";
import { useActiveOverrides } from "./useActiveOverrides";

type Experiment = RouterOutputs["viewer"]["admin"]["experiments"]["list"][number];
type ExperimentStatus = Experiment["status"];

const STATUS_BADGE_VARIANT: Record<ExperimentStatus, "secondary" | "success" | "warning" | "info"> = {
  DRAFT: "secondary",
  RUNNING: "success",
  STOPPED: "warning",
  ROLLED_OUT: "info",
};

const TARGET_LABEL_KEYS: Record<string, string> = {
  "logged-in": "experiment_target_logged_in",
  anonymous: "experiment_target_anonymous",
};

function ActiveOverridesBanner({
  overrides,
  onClear,
  onClearAll,
}: {
  overrides: Record<string, string>;
  onClear: (slug: string) => void;
  onClearAll: () => void;
}) {
  const { t } = useLocale();
  const entries = Object.entries(overrides);
  if (entries.length === 0) return null;

  return (
    <div className="bg-subtle border-subtle mb-4 rounded-md border p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-emphasis text-sm font-medium">{t("active_previews")}</span>
        <Button variant="ghost" size="sm" onClick={onClearAll}>
          {t("clear_all")}
        </Button>
      </div>
      <p className="text-subtle mb-2 flex items-center gap-1 text-xs">
        <InfoIcon className="h-3 w-3 shrink-0" />
        {t("active_previews_hint")}
      </p>
      <div className="flex flex-wrap gap-2">
        {entries.map(([slug, variant]) => (
          <Badge key={slug} variant="info">
            {slug}: {variant}
            <button
              className="ml-1 hover:opacity-70"
              onClick={() => onClear(slug)}
              aria-label={`Clear ${slug} preview`}>
              &times;
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}

function VariantWeightRow({
  experiment,
  variantSlug,
  label,
  weight,
  isControl,
}: {
  experiment: Experiment;
  variantSlug: string;
  label: string | null;
  weight: number;
  isControl: boolean;
}) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [localWeight, setLocalWeight] = useState(String(weight));

  const updateWeightMutation = trpc.viewer.admin.experiments.updateVariantWeight.useMutation({
    onSuccess: () => {
      toastManager.add({ title: t("experiment_weight_updated"), type: "success" });
      utils.viewer.admin.experiments.list.invalidate();
    },
    onError: () => {
      toastManager.add({ title: t("something_went_wrong"), type: "error" });
      setLocalWeight(String(weight));
    },
  });

  const handleBlur = () => {
    const parsed = Math.floor(Number(localWeight));
    const value = Number.isNaN(parsed) || parsed < 0 ? 0 : Math.min(parsed, 100);
    setLocalWeight(String(value));

    if (value !== weight) {
      // Check that total variant weights don't exceed 100%
      const otherWeights = experiment.variants
        .filter((v) => v.slug !== variantSlug)
        .reduce((sum, v) => sum + v.weight, 0);
      if (otherWeights + value > 100) {
        toastManager.add({ title: t("experiment_weight_exceeds_100"), type: "error" });
        setLocalWeight(String(weight));
        return;
      }
      updateWeightMutation.mutate({
        experimentSlug: experiment.slug,
        variantSlug,
        weight: value,
      });
    }
  };

  return (
    <TableRow>
      <TableCell>
        {label ?? variantSlug}
        {isControl && (
          <Badge variant="secondary" className="ml-2">
            {t("default")}
          </Badge>
        )}
        {experiment.status === "ROLLED_OUT" &&
          (isControl ? experiment.winner === null : experiment.winner === variantSlug) && (
            <Badge variant="success" className="ml-2">
              {t("winner")}
            </Badge>
          )}
      </TableCell>
      <TableCell>
        {isControl || experiment.status === "ROLLED_OUT" || experiment.status === "RUNNING" ? (
          <span className="text-subtle text-sm">{weight}%</span>
        ) : (
          <Input
            type="number"
            min={0}
            max={100}
            step={1}
            className="w-20 -ml-2.5"
            value={localWeight}
            onChange={(e) => setLocalWeight(e.target.value)}
            onBlur={handleBlur}
          />
        )}
      </TableCell>
    </TableRow>
  );
}

function ExperimentCard({
  experiment,
  onPreview,
}: {
  experiment: Experiment;
  onPreview: (slug: string, variant: string) => void;
}) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const STATUS_TOAST_KEYS: Record<string, string> = {
    RUNNING: "experiment_started",
    STOPPED: "experiment_stopped",
    DRAFT: "experiment_status_reset",
  };

  const updateStatusMutation = trpc.viewer.admin.experiments.updateStatus.useMutation({
    onSuccess: (_data, variables) => {
      const messageKey = STATUS_TOAST_KEYS[variables.status] ?? "experiment_status_reset";
      toastManager.add({ title: t(messageKey), type: "success" });
      utils.viewer.admin.experiments.list.invalidate();
    },
    onError: () => {
      toastManager.add({ title: t("something_went_wrong"), type: "error" });
    },
  });

  const setWinnerMutation = trpc.viewer.admin.experiments.setWinner.useMutation({
    onSuccess: () => {
      toastManager.add({ title: t("experiment_winner_set"), type: "success" });
      utils.viewer.admin.experiments.list.invalidate();
    },
    onError: () => {
      toastManager.add({ title: t("something_went_wrong"), type: "error" });
    },
  });

  const variantWeights = experiment.variants;
  const nonControlWeight = variantWeights.reduce((sum, v) => sum + v.weight, 0);
  const controlWeight = Math.max(0, 100 - nonControlWeight);

  return (
    <Collapsible defaultOpen>
      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>
            <div className="flex items-center gap-2">
              <CollapsibleTrigger>
                <ChevronDownIcon className="h-4 w-4 transition-transform in-data-[panel-open]:rotate-180" />
              </CollapsibleTrigger>
              <span>{experiment.label ?? experiment.slug}</span>
              <Badge variant={STATUS_BADGE_VARIANT[experiment.status]}>{experiment.status}</Badge>
              <Badge variant="secondary">{t(TARGET_LABEL_KEYS[experiment.target] ?? experiment.target)}</Badge>
            </div>
          </CardFrameTitle>
          {experiment.description && (
            <CardFrameDescription className="pl-6">{experiment.description}</CardFrameDescription>
          )}
        </CardFrameHeader>
        <CollapsiblePanel>
          <Card>
            <CardPanel>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("variant")}</TableHead>
                    <TableHead>{t("weight")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <VariantWeightRow
                    experiment={experiment}
                    variantSlug={CONTROL_GROUP}
                    label={t("control")}
                    weight={controlWeight}
                    isControl={true}
                  />
                  {variantWeights.map((v) => (
                    <VariantWeightRow
                      key={v.slug}
                      experiment={experiment}
                      variantSlug={v.slug}
                      label={v.label}
                      weight={v.weight}
                      isControl={false}
                    />
                  ))}
                </TableBody>
              </Table>
            </CardPanel>
            <CardFooter className="flex items-center justify-between">
              <Menu>
                <MenuTrigger>
                  <Button variant="outline" size="sm">
                    {t("preview")}
                  </Button>
                </MenuTrigger>
                <MenuPopup align="start">
                  <MenuItem onClick={() => onPreview(experiment.slug, CONTROL_GROUP)}>
                    {t("control")}
                  </MenuItem>
                  {variantWeights.map((v) => (
                    <MenuItem key={v.slug} onClick={() => onPreview(experiment.slug, v.slug)}>
                      {v.label ?? v.slug}
                    </MenuItem>
                  ))}
                </MenuPopup>
              </Menu>

              <div className="flex flex-wrap items-center gap-2">
                {experiment.status === "DRAFT" && (
                  <Button
                    size="sm"
                    disabled={updateStatusMutation.isPending}
                    onClick={() =>
                      updateStatusMutation.mutate({ slug: experiment.slug, status: "RUNNING" })
                    }>
                    {t("start")}
                  </Button>
                )}

                {experiment.status === "RUNNING" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updateStatusMutation.isPending}
                      onClick={() =>
                        updateStatusMutation.mutate({ slug: experiment.slug, status: "STOPPED" })
                      }>
                      {t("stop")}
                    </Button>
                    <Menu>
                      <MenuTrigger>
                        <Button variant="outline" size="sm">
                          {t("roll_out_winner")}
                        </Button>
                      </MenuTrigger>
                      <MenuPopup>
                        <MenuItem
                          onClick={() =>
                            setWinnerMutation.mutate({ slug: experiment.slug, variantSlug: null })
                          }>
                          {t("control")}
                        </MenuItem>
                        {variantWeights.map((v) => (
                          <MenuItem
                            key={v.slug}
                            onClick={() =>
                              setWinnerMutation.mutate({ slug: experiment.slug, variantSlug: v.slug })
                            }>
                            {v.label ?? v.slug}
                          </MenuItem>
                        ))}
                      </MenuPopup>
                    </Menu>
                  </>
                )}

                {experiment.status === "STOPPED" && (
                  <Button
                    size="sm"
                    disabled={updateStatusMutation.isPending}
                    onClick={() =>
                      updateStatusMutation.mutate({ slug: experiment.slug, status: "RUNNING" })
                    }>
                    {t("restart")}
                  </Button>
                )}

                {experiment.status === "ROLLED_OUT" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={updateStatusMutation.isPending}
                    onClick={() =>
                      updateStatusMutation.mutate({ slug: experiment.slug, status: "DRAFT" })
                    }>
                    {t("reset")}
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        </CollapsiblePanel>
      </CardFrame>
    </Collapsible>
  );
}

export const ExperimentsAdminList = () => {
  const { t } = useLocale();
  const [data] = trpc.viewer.admin.experiments.list.useSuspenseQuery();
  const { overrides, setOverride, clearOverride, clearAll } = useActiveOverrides();

  const handlePreview = (slug: string, variant: string) => {
    setOverride(slug, variant);
    toastManager.add({ title: t("experiment_preview_activated"), type: "success" });
  };

  const handleClearOverride = (slug: string) => {
    clearOverride(slug);
    toastManager.add({ title: t("experiment_preview_cleared"), type: "success" });
  };

  const handleClearAll = () => {
    clearAll();
    toastManager.add({ title: t("experiment_preview_all_cleared"), type: "success" });
  };

  return (
    <div className="space-y-4">
      <ActiveOverridesBanner
        overrides={overrides}
        onClear={handleClearOverride}
        onClearAll={handleClearAll}
      />
      {data.map((experiment) => (
        <ExperimentCard key={experiment.slug} experiment={experiment} onPreview={handlePreview} />
      ))}
    </div>
  );
};
