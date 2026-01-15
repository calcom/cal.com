"use client";

import type { OptInFeatureConfig } from "@calcom/features/feature-opt-in/config";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { CheckboxField, Label } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { RadioField, RadioGroup } from "@calcom/ui/components/radio";
import { showToast } from "@calcom/ui/components/toast";
import { useRouter } from "next/navigation";
import type { ReactElement } from "react";
import { useState } from "react";

type UserRoleContext = {
  isOrgAdmin: boolean;
  orgId: number | null;
  adminTeamIds: number[];
  adminTeamNames: { id: number; name: string }[];
};

type OptInScope = "user" | "org" | "teams";

interface FeatureOptInConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDismissBanner: () => void;
  featureConfig: OptInFeatureConfig;
  userRoleContext: UserRoleContext;
}

export function FeatureOptInConfirmDialog({
  isOpen,
  onClose,
  onDismissBanner,
  featureConfig,
  userRoleContext,
}: FeatureOptInConfirmDialogProps): ReactElement {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();

  const [scope, setScope] = useState<OptInScope>("user");
  const [autoOptIn, setAutoOptIn] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [shouldInvalidate, setShouldInvalidate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setUserStateMutation = trpc.viewer.featureOptIn.setUserState.useMutation();
  const setTeamStateMutation = trpc.viewer.featureOptIn.setTeamState.useMutation();
  const setOrganizationStateMutation = trpc.viewer.featureOptIn.setOrganizationState.useMutation();
  const setUserAutoOptInMutation = trpc.viewer.featureOptIn.setUserAutoOptIn.useMutation();
  const setTeamAutoOptInMutation = trpc.viewer.featureOptIn.setTeamAutoOptIn.useMutation();
  const setOrganizationAutoOptInMutation = trpc.viewer.featureOptIn.setOrganizationAutoOptIn.useMutation();

  const { isOrgAdmin, orgId, adminTeamIds, adminTeamNames } = userRoleContext;
  const hasAdminTeams = adminTeamIds.length > 0;
  const canEnableForOrg = isOrgAdmin && orgId !== null;
  const canEnableForTeams = hasAdminTeams;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      if (scope === "org" && orgId) {
        await setOrganizationStateMutation.mutateAsync({ slug: featureConfig.slug, state: "enabled" });
        if (autoOptIn) {
          await setOrganizationAutoOptInMutation.mutateAsync({ autoOptIn: true });
        }
      } else if (scope === "teams") {
        await Promise.all(
          adminTeamIds.map((teamId) =>
            setTeamStateMutation.mutateAsync({ teamId, slug: featureConfig.slug, state: "enabled" })
          )
        );
        if (autoOptIn) {
          await Promise.all(
            adminTeamIds.map((teamId) => setTeamAutoOptInMutation.mutateAsync({ teamId, autoOptIn: true }))
          );
        }
      } else {
        await setUserStateMutation.mutateAsync({ slug: featureConfig.slug, state: "enabled" });
        if (autoOptIn) {
          await setUserAutoOptInMutation.mutateAsync({ autoOptIn: true });
        }
      }

      setIsSuccess(true);
      setShouldInvalidate(true);
    } catch (_error) {
      showToast(t("error_enabling_feature"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewSettings = () => {
    onDismissBanner();
    resetAndClose();
    if (scope === "org") {
      router.push("/settings/organizations/features");
    } else if (scope === "teams" && adminTeamIds.length > 0) {
      router.push(`/settings/teams/${adminTeamIds[0]}/features`);
    } else {
      router.push("/settings/my-account/features");
    }
  };

  const handleDismiss = () => {
    onDismissBanner();
    resetAndClose();
  };

  const resetAndClose = () => {
    if (shouldInvalidate) {
      utils.viewer.featureOptIn.checkFeatureOptInEligibility.invalidate();
      utils.viewer.featureOptIn.listForUser.invalidate();
      setShouldInvalidate(false);
    }
    setIsSuccess(false);
    setScope("user");
    setAutoOptIn(false);
    onClose();
  };

  if (isSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={resetAndClose}>
        <DialogContent title="" type="creation">
          <div className="flex flex-col items-center py-6 text-center">
            <div className="bg-success/10 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <Icon name="check" className="text-success h-6 w-6" />
            </div>
            <h3 className="text-emphasis text-lg font-semibold">{t("feature_enabled_successfully")}</h3>
            <p className="text-subtle mt-2 text-sm">{t("feature_enabled_description")}</p>
          </div>
          <DialogFooter>
            <Button color="secondary" onClick={handleDismiss}>
              {t("dismiss")}
            </Button>
            <Button color="primary" onClick={handleViewSettings}>
              {t("view_settings")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={resetAndClose}>
      <DialogContent title={t("enable_feature")} type="creation">
        <div className="space-y-4">
          <div>
            <h4 className="text-emphasis font-medium">{t(featureConfig.titleI18nKey)}</h4>
            <p className="text-subtle mt-1 text-sm">{t(featureConfig.descriptionI18nKey)}</p>
          </div>

          {(canEnableForOrg || canEnableForTeams) && (
            <div className="space-y-3">
              <Label>{t("enable_for")}</Label>
              <RadioGroup value={scope} onValueChange={(value) => setScope(value as OptInScope)}>
                {canEnableForOrg && (
                  <RadioField value="org" label={t("entire_organization")} id="scope-org" />
                )}
                {canEnableForTeams && (
                  <RadioField
                    value="teams"
                    label={
                      adminTeamNames.length === 1
                        ? t("team_name", { name: adminTeamNames[0].name })
                        : t("my_teams_count", { count: adminTeamNames.length })
                    }
                    id="scope-teams"
                  />
                )}
                <RadioField value="user" label={t("just_for_me")} id="scope-user" />
              </RadioGroup>
            </div>
          )}

          <div className="border-subtle border-t pt-4">
            <CheckboxField
              checked={autoOptIn}
              onChange={(e) => setAutoOptIn(e.target.checked)}
              description={
                scope === "org"
                  ? t("auto_opt_in_future_features_org")
                  : scope === "teams"
                    ? t("auto_opt_in_future_features_teams")
                    : t("auto_opt_in_future_features_user")
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button color="secondary" onClick={resetAndClose} disabled={isSubmitting}>
            {t("cancel")}
          </Button>
          <Button color="primary" onClick={handleConfirm} loading={isSubmitting}>
            {t("enable_feature")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default FeatureOptInConfirmDialog;
