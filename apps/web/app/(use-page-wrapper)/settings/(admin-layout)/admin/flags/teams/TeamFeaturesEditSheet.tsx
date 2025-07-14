"use client";

import { useState } from "react";

import type { AppFlags, TeamFeatures } from "@calcom/features/flags/config";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Button } from "@calcom/ui/components/button";
import { Checkbox } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

type TeamWithFeatures = {
  id: number;
  name: string;
  slug: string | null;
  parentId: number | null;
  isOrganization: boolean;
  platformBilling: { id: number } | null;
  children: { id: number; name: string }[];
  features: TeamFeatures;
};

interface TeamFeaturesEditSheetProps {
  team: TeamWithFeatures;
  onClose: () => void;
}

const AVAILABLE_FEATURES: (keyof AppFlags)[] = [
  "calendar-cache",
  "calendar-cache-serve",
  "emails",
  "insights",
  "teams",
  "webhooks",
  "workflows",
  "organizations",
  "email-verification",
  "google-workspace-directory",
  "attributes",
  "organizer-request-email-v2",
  "delegation-credential",
  "salesforce-crm-tasker",
  "workflow-smtp-emails",
  "cal-video-log-in-overlay",
  "use-api-v2-for-team-slots",
  "pbac",
  "restriction-schedule",
];

export function TeamFeaturesEditSheet({ team, onClose }: TeamFeaturesEditSheetProps) {
  const { t } = useLocale();
  const [features, setFeatures] = useState<TeamFeatures>(team.features);
  const [isLoading, setIsLoading] = useState(false);

  const utils = trpc.useUtils();
  const updateFeaturesMutation = trpc.viewer.admin.teamFeatures.updateFeatures.useMutation({
    onSuccess: () => {
      showToast(t("team_features_updated_successfully"), "success");
      utils.viewer.admin.teamFeatures.listAllWithFeatures.invalidate();
      onClose();
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const handleFeatureToggle = (featureKey: string, enabled: boolean) => {
    setFeatures((prev) => ({
      ...prev,
      [featureKey]: enabled,
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateFeaturesMutation.mutateAsync({
        teamId: team.id,
        features,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">{t("team_information")}</h3>
          <div className="mt-2 space-y-2 text-sm text-gray-600">
            <p>
              <strong>{t("name")}:</strong> {team.name}
            </p>
            <p>
              <strong>{t("slug")}:</strong> {team.slug || "-"}
            </p>
            <p>
              <strong>{t("subscription_id")}:</strong> {team.platformBilling?.id || "-"}
            </p>
            <p>
              <strong>{t("type")}:</strong> {team.isOrganization ? t("organization") : t("team")}
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium">{t("features")}</h3>
          <div className="mt-4 space-y-3">
            {AVAILABLE_FEATURES.map((featureKey) => (
              <div key={featureKey} className="flex items-center space-x-3">
                <Checkbox
                  checked={features[featureKey] || false}
                  onCheckedChange={(checked) => handleFeatureToggle(featureKey, !!checked)}
                />
                <label className="text-sm font-medium">{featureKey}</label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <Button variant="button" color="secondary" onClick={onClose} disabled={isLoading}>
          {t("cancel")}
        </Button>
        <Button onClick={handleSave} loading={isLoading}>
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
