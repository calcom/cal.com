"use client";

import type { OptInFeatureConfig } from "@calcom/features/feature-opt-in/config";
import {
  FilterCheckboxField,
  FilterCheckboxFieldsContainer,
} from "@calcom/features/filters/components/TeamsFilter";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Divider } from "@calcom/ui/components/divider";
import { CheckboxField, Label } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";
import { Button } from "@coss/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@coss/ui/components/dialog";
import { Popover, PopoverPopup, PopoverTrigger } from "@coss/ui/components/popover";
import { ChevronDownIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactElement } from "react";
import { useState } from "react";

type UserRoleContext = {
  isOrgAdmin: boolean;
  orgId: number | null;
  adminTeamIds: number[];
  adminTeamNames: { id: number; name: string }[];
};

interface FeatureOptInConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDismissBanner: () => void;
  onOptInSuccess?: () => void;
  featureConfig: OptInFeatureConfig;
  userRoleContext: UserRoleContext;
}

export function FeatureOptInConfirmDialog({
  isOpen,
  onClose,
  onDismissBanner,
  onOptInSuccess,
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

  const [enableForUser, setEnableForUser] = useState(true);
  const [enableForOrg, setEnableForOrg] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState<number[]>([]);
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

  const hasTeamsSelected = selectedTeamIds.length > 0;
  const hasAnySelection = enableForUser || enableForOrg || hasTeamsSelected;

  const getSelectedText = (): string => {
    const parts: string[] = [];
    if (enableForUser) parts.push(t("just_for_me"));
    if (enableForOrg) parts.push(t("entire_organization"));
    if (hasTeamsSelected) {
      const teamNames = adminTeamNames
        .filter((team) => selectedTeamIds.includes(team.id))
        .map((team) => team.name);
      parts.push(...teamNames);
    }
    return parts.length > 0 ? parts.join(", ") : t("select");
  };

  const handleUserChange = (checked: boolean): void => {
    setEnableForUser(checked);
    if (checked) {
      setEnableForOrg(false);
      setSelectedTeamIds([]);
    }
  };

  const handleOrgChange = (checked: boolean): void => {
    setEnableForOrg(checked);
    if (checked) {
      setEnableForUser(false);
      setSelectedTeamIds([]);
    }
  };

  const handleTeamChange = (teamId: number, checked: boolean): void => {
    if (checked) {
      setSelectedTeamIds((prev) => [...prev, teamId]);
      setEnableForUser(false);
      setEnableForOrg(false);
    } else {
      setSelectedTeamIds((prev) => prev.filter((id) => id !== teamId));
    }
  };

  const getAutoOptInText = (): string => {
    if (enableForOrg) {
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

      if (enableForOrg && orgId) {
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

      if (enableForUser) {
        promises.push(setUserStateMutation.mutateAsync({ slug: featureConfig.slug, state: "enabled" }));
        if (autoOptIn) {
          promises.push(setUserAutoOptInMutation.mutateAsync({ autoOptIn: true }));
        }
      }

      await Promise.all(promises);

      setIsSuccess(true);
      setShouldInvalidate(true);
      onOptInSuccess?.();
    } catch (_error) {
      showToast(t("error_enabling_feature"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSettingsRedirectPath = (): string => {
    if (enableForOrg) {
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
    setEnableForUser(true);
    setEnableForOrg(false);
    setSelectedTeamIds([]);
    setAutoOptIn(false);
    onClose();
  };

  if (isSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={resetAndClose}>
        <DialogPopup className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("feature_enabled_successfully")}</DialogTitle>
            <DialogDescription>{t("feature_enabled_description")}</DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <div className="flex flex-col items-center py-6 text-center">
              <div className="bg-success/10 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                <Icon name="check" className="text-success h-6 w-6" />
              </div>
            </div>
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />} onClick={handleDismiss}>
              {t("dismiss")}
            </DialogClose>
            <Button onClick={handleViewSettings}>{t("view_settings")}</Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={resetAndClose}>
      <DialogPopup className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t(featureConfig.nameI18nKey)}</DialogTitle>
          <DialogDescription>{t(featureConfig.descriptionI18nKey)}</DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <div className="space-y-4">
            {showSelector && (
              <div className="space-y-2">
                <Label>{t("enable_for")}</Label>
                <Popover>
                  <PopoverTrigger
                    render={
                      <button
                        type="button"
                        className="border-default bg-default text-default hover:bg-muted flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm"
                      />
                    }>
                    <span className="truncate leading-normal">{getSelectedText()}</span>
                    <ChevronDownIcon aria-hidden="true" className="ml-2 h-4 w-4 shrink-0" />
                  </PopoverTrigger>
                  <PopoverPopup className="w-56">
                    <FilterCheckboxFieldsContainer>
                      <FilterCheckboxField
                        id="just-for-me"
                        icon={<Icon name="user" className="h-4 w-4" />}
                        checked={enableForUser}
                        onChange={(e) => handleUserChange(e.target.checked)}
                        label={t("just_for_me")}
                      />

                      {canEnableForOrg && (
                        <>
                          <Divider />
                          <FilterCheckboxField
                            id="entire-org"
                            icon={<Icon name="building" className="h-4 w-4" />}
                            checked={enableForOrg}
                            onChange={(e) => handleOrgChange(e.target.checked)}
                            label={t("entire_organization")}
                          />
                        </>
                      )}

                      {canEnableForTeams && adminTeamNames.length > 0 && (
                        <>
                          <Divider />
                          {adminTeamNames.map((team) => (
                            <FilterCheckboxField
                              key={team.id}
                              id={`team-${team.id}`}
                              icon={<Icon name="users" className="h-4 w-4" />}
                              checked={selectedTeamIds.includes(team.id)}
                              onChange={(e) => handleTeamChange(team.id, e.target.checked)}
                              label={team.name}
                            />
                          ))}
                        </>
                      )}
                    </FilterCheckboxFieldsContainer>
                  </PopoverPopup>
                </Popover>
              </div>
            )}

            <CheckboxField
              checked={autoOptIn}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAutoOptIn(e.target.checked)}
              description={getAutoOptInText()}
            />
          </div>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />} onClick={resetAndClose} disabled={isSubmitting}>
            {t("cancel")}
          </DialogClose>
          <Button onClick={handleConfirm} disabled={isSubmitting || !hasAnySelection}>
            {t("enable")}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

export default FeatureOptInConfirmDialog;
