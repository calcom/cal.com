"use client";

import type { OptInFeatureConfig } from "@calcom/features/feature-opt-in/config";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { CheckboxField, Label, Select } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";
import { useRouter } from "next/navigation";
import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import type { MultiValue, SingleValue } from "react-select";

type UserRoleContext = {
  isOrgAdmin: boolean;
  orgId: number | null;
  adminTeamIds: number[];
  adminTeamNames: { id: number; name: string }[];
};

type SelectOption = {
  value: string;
  label: string;
};

const OPTION_USER = "user";
const OPTION_ORG = "org";

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

  const { isOrgAdmin, orgId, adminTeamIds, adminTeamNames } = userRoleContext;
  const hasAdminTeams = adminTeamIds.length > 0;
  const canEnableForOrg = isOrgAdmin && orgId !== null;
  const canEnableForTeams = hasAdminTeams;
  const showSelector = canEnableForOrg || canEnableForTeams;

  const options = useMemo((): SelectOption[] => {
    const opts: SelectOption[] = [{ value: OPTION_USER, label: t("just_for_me") }];

    if (canEnableForOrg) {
      opts.push({ value: OPTION_ORG, label: t("entire_organization") });
    }

    if (canEnableForTeams) {
      adminTeamNames.forEach((team) => {
        opts.push({ value: `team-${team.id}`, label: team.name });
      });
    }

    return opts;
  }, [canEnableForOrg, canEnableForTeams, adminTeamNames, t]);

  const defaultOption = options.find((opt) => opt.value === OPTION_USER);
  const [selectedOptions, setSelectedOptions] = useState<SelectOption[]>(
    defaultOption ? [defaultOption] : []
  );
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

  const handleSelectionChange = (selected: MultiValue<SelectOption> | SingleValue<SelectOption>): void => {
    if (!selected) {
      setSelectedOptions([]);
      return;
    }

    if (!Array.isArray(selected)) {
      setSelectedOptions([selected]);
      return;
    }

    const newSelection = selected as SelectOption[];
    const previousValues = selectedOptions.map((opt) => opt.value);
    const newValues = newSelection.map((opt) => opt.value);

    const orgWasSelected = previousValues.includes(OPTION_ORG);
    const orgIsNowSelected = newValues.includes(OPTION_ORG);

    if (!orgWasSelected && orgIsNowSelected) {
      setSelectedOptions(newSelection.filter((opt) => opt.value === OPTION_ORG || opt.value === OPTION_USER));
    } else if (orgIsNowSelected && newSelection.some((opt) => opt.value.startsWith("team-"))) {
      setSelectedOptions(newSelection.filter((opt) => opt.value !== OPTION_ORG));
    } else {
      setSelectedOptions(newSelection);
    }
  };

  const hasOrgSelected = selectedOptions.some((opt) => opt.value === OPTION_ORG);
  const hasUserSelected = selectedOptions.some((opt) => opt.value === OPTION_USER);
  const selectedTeamIds = selectedOptions
    .filter((opt) => opt.value.startsWith("team-"))
    .map((opt) => parseInt(opt.value.replace("team-", ""), 10));
  const hasTeamsSelected = selectedTeamIds.length > 0;

  const getAutoOptInText = (): string => {
    if (hasOrgSelected) {
      return t("auto_opt_in_future_features_org");
    }
    if (hasTeamsSelected) {
      return t("auto_opt_in_future_features_teams");
    }
    return t("auto_opt_in_future_features_user");
  };

  const handleConfirm = async (): Promise<void> => {
    setIsSubmitting(true);
    try {
      const promises: Promise<unknown>[] = [];

      if (hasOrgSelected && orgId) {
        promises.push(
          setOrganizationStateMutation.mutateAsync({ slug: featureConfig.slug, state: "enabled" })
        );
        if (autoOptIn) {
          promises.push(setOrganizationAutoOptInMutation.mutateAsync({ autoOptIn: true }));
        }
      }

      if (hasTeamsSelected) {
        selectedTeamIds.forEach((teamId) => {
          promises.push(
            setTeamStateMutation.mutateAsync({ teamId, slug: featureConfig.slug, state: "enabled" })
          );
          if (autoOptIn) {
            promises.push(setTeamAutoOptInMutation.mutateAsync({ teamId, autoOptIn: true }));
          }
        });
      }

      if (hasUserSelected) {
        promises.push(setUserStateMutation.mutateAsync({ slug: featureConfig.slug, state: "enabled" }));
        if (autoOptIn) {
          promises.push(setUserAutoOptInMutation.mutateAsync({ autoOptIn: true }));
        }
      }

      await Promise.all(promises);

      setIsSuccess(true);
      setShouldInvalidate(true);
    } catch (_error) {
      showToast(t("error_enabling_feature"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSettingsRedirectPath = (): string => {
    if (hasOrgSelected) {
      return "/settings/organizations/features";
    }
    if (hasTeamsSelected && selectedTeamIds.length > 0) {
      return `/settings/teams/${selectedTeamIds[0]}/features`;
    }
    return "/settings/my-account/features";
  };

  const handleViewSettings = (): void => {
    onDismissBanner();
    resetAndClose();
    router.push(getSettingsRedirectPath());
  };

  const handleDismiss = (): void => {
    onDismissBanner();
    resetAndClose();
  };

  const resetAndClose = (): void => {
    if (shouldInvalidate) {
      utils.viewer.featureOptIn.checkFeatureOptInEligibility.invalidate();
      utils.viewer.featureOptIn.listForUser.invalidate();
      setShouldInvalidate(false);
    }
    setIsSuccess(false);
    setSelectedOptions(defaultOption ? [defaultOption] : []);
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
      <DialogContent title={t(featureConfig.titleI18nKey)} type="creation">
        <div className="space-y-4">
          <p className="text-subtle text-sm">{t(featureConfig.descriptionI18nKey)}</p>

          {showSelector && (
            <div className="space-y-2">
              <Label>{t("enable_for")}</Label>
              <Select
                isMulti
                value={selectedOptions}
                onChange={handleSelectionChange}
                options={options}
                closeMenuOnSelect={false}
                className="w-full"
              />
            </div>
          )}

          <div className="border-subtle border-t pt-4">
            <CheckboxField
              checked={autoOptIn}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAutoOptIn(e.target.checked)}
              description={getAutoOptInText()}
            />
          </div>
        </div>

        <DialogFooter>
          <Button color="secondary" onClick={resetAndClose} disabled={isSubmitting}>
            {t("cancel")}
          </Button>
          <Button
            color="primary"
            onClick={handleConfirm}
            loading={isSubmitting}
            disabled={selectedOptions.length === 0}>
            {t("enable")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default FeatureOptInConfirmDialog;
