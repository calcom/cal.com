"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { Form, TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@calcom/ui/components/sheet";
import { showToast } from "@calcom/ui/components/toast";

const confirmationSchema = z.object({
  confirmationSlug: z.string().min(1, "Confirmation slug is required"),
});

type ConfirmationFormData = z.infer<typeof confirmationSchema>;

interface TeamFeaturesSheetProps {
  teamId: number;
  open: boolean;
  onClose: () => void;
}

export function TeamFeaturesSheet({ teamId, open, onClose }: TeamFeaturesSheetProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [actionType, setActionType] = useState<"assign" | "remove">("assign");

  const { data: allFeatures } = trpc.viewer.features.list.useQuery();
  const { data: teamFeatures } = trpc.viewer.admin.teams.getFeatures.useQuery({ teamId }, { enabled: open });

  const form = useForm<ConfirmationFormData>({
    resolver: zodResolver(confirmationSchema),
    defaultValues: {
      confirmationSlug: "",
    },
  });

  const assignFeatureMutation = trpc.viewer.admin.teams.assignFeature.useMutation({
    onSuccess: () => {
      showToast(t("feature_assigned_successfully"), "success");
      utils.viewer.admin.teams.getFeatures.invalidate({ teamId });
      handleCloseConfirmation();
    },
    onError: (error) => {
      showToast(error.message || t("error_assigning_feature"), "error");
    },
  });

  const removeFeatureMutation = trpc.viewer.admin.teams.removeFeature.useMutation({
    onSuccess: () => {
      showToast(t("feature_removed_successfully"), "success");
      utils.viewer.admin.teams.getFeatures.invalidate({ teamId });
      handleCloseConfirmation();
    },
    onError: (error) => {
      showToast(error.message || t("error_removing_feature"), "error");
    },
  });

  const handleAssignFeature = (featureId: string) => {
    setSelectedFeature(featureId);
    setActionType("assign");
    setShowConfirmation(true);
  };

  const handleRemoveFeature = (featureId: string) => {
    setSelectedFeature(featureId);
    setActionType("remove");
    setShowConfirmation(true);
  };

  const handleCloseConfirmation = () => {
    setShowConfirmation(false);
    setSelectedFeature(null);
    form.reset();
  };

  const onSubmit = (data: ConfirmationFormData) => {
    if (!selectedFeature) return;

    if (actionType === "assign") {
      assignFeatureMutation.mutate({
        teamId,
        featureId: selectedFeature,
        confirmationSlug: data.confirmationSlug,
      });
    } else {
      if (data.confirmationSlug === selectedFeature) {
        removeFeatureMutation.mutate({
          teamId,
          featureId: selectedFeature,
        });
      } else {
        showToast(t("confirmation_slug_mismatch"), "error");
      }
    }
  };

  const assignedFeatureIds = teamFeatures?.map((tf) => tf.featureId) || [];
  const availableFeatures = allFeatures?.filter((f) => !assignedFeatureIds.includes(f.slug)) || [];

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>{t("manage_team_features")}</SheetTitle>
            <SheetDescription>{t("manage_team_features_description")}</SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-4">
            {/* Assigned Features */}
            <div>
              <h3 className="mb-3 text-lg font-medium">{t("assigned_features")}</h3>
              {teamFeatures && teamFeatures.length > 0 ? (
                <div className="space-y-2">
                  {teamFeatures.map((teamFeature) => (
                    <div
                      key={teamFeature.featureId}
                      className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="green">{teamFeature.feature.slug}</Badge>
                        <span className="text-sm text-gray-600">
                          {t("assigned_at")}: {new Date(teamFeature.assignedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <Button
                        color="secondary"
                        size="sm"
                        onClick={() => handleRemoveFeature(teamFeature.featureId)}>
                        <Icon name="trash" className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">{t("no_features_assigned")}</p>
              )}
            </div>

            {/* Available Features */}
            <div>
              <h3 className="mb-3 text-lg font-medium">{t("available_features")}</h3>
              {availableFeatures.length > 0 ? (
                <div className="space-y-2">
                  {availableFeatures.map((feature) => (
                    <div
                      key={feature.slug}
                      className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <Badge variant={feature.enabled ? "blue" : "gray"}>{feature.slug}</Badge>
                        <span className="text-sm text-gray-600">
                          {feature.enabled ? t("enabled_globally") : t("disabled_globally")}
                        </span>
                      </div>
                      <Button color="secondary" size="sm" onClick={() => handleAssignFeature(feature.slug)}>
                        <Icon name="plus" className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">{t("no_features_available")}</p>
              )}
            </div>
          </div>

          <SheetFooter>
            <Button type="button" color="secondary" onClick={onClose}>
              {t("close")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={handleCloseConfirmation}>
        <DialogContent>
          <DialogHeader
            title={actionType === "assign" ? t("confirm_feature_assignment") : t("confirm_feature_removal")}
            subtitle={
              actionType === "assign"
                ? t("confirm_feature_assignment_description", { feature: selectedFeature })
                : t("confirm_feature_removal_description", { feature: selectedFeature })
            }
          />

          <Form form={form} handleSubmit={onSubmit}>
            <div className="space-y-4">
              <TextField
                label={t("type_feature_slug_to_confirm")}
                placeholder={selectedFeature || ""}
                {...form.register("confirmationSlug")}
                error={form.formState.errors.confirmationSlug?.message}
              />
            </div>

            <DialogFooter>
              <Button type="button" color="secondary" onClick={handleCloseConfirmation}>
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                color={actionType === "remove" ? "destructive" : "primary"}
                loading={assignFeatureMutation.isPending || removeFeatureMutation.isPending}>
                {actionType === "assign" ? t("assign_feature") : t("remove_feature")}
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
